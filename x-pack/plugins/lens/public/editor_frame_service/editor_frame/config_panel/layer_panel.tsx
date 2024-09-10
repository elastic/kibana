/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './layer_panel.scss';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  EuiPanel,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiText,
  EuiIconTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { DragDropIdentifier, ReorderProvider, DropType } from '@kbn/dom-drag-drop';
import { DimensionButton } from '@kbn/visualization-ui-components';
import { LayerActions } from './layer_actions';
import { isOperation, LayerAction, VisualizationDimensionGroupConfig } from '../../../types';
import { LayerHeader } from './layer_header';
import { LayerPanelProps } from './types';
import { DimensionContainer } from './dimension_container';
import { EmptyDimensionButton } from './buttons/empty_dimension_button';
import { DraggableDimensionButton } from './buttons/draggable_dimension_button';
import { useFocusUpdate } from './use_focus_update';
import {
  useLensSelector,
  selectIsFullscreenDatasource,
  selectResolvedDateRange,
  selectDatasourceStates,
} from '../../../state_management';
import { getSharedActions } from './layer_actions/layer_actions';
import { FlyoutContainer } from '../../../shared_components/flyout_container';
import { FakeDimensionButton } from './buttons/fake_dimension_button';

export function LayerPanel(props: LayerPanelProps) {
  const [openDimension, setOpenDimension] = useState<{
    isComplete?: boolean;
    openColumnId?: string;
    openColumnGroup?: VisualizationDimensionGroupConfig;
  }>({});

  const [isPanelSettingsOpen, setPanelSettingsOpen] = useState(false);

  const {
    framePublicAPI,
    layerId,
    isOnlyLayer,
    dimensionGroups,
    onRemoveLayer,
    onCloneLayer,
    registerNewLayerRef,
    layerIndex,
    activeVisualization,
    visualizationMap,
    datasourceMap,
    updateVisualization,
    updateDatasource,
    toggleFullscreen,
    updateAll,
    updateDatasourceAsync,
    visualizationState,
    onChangeIndexPattern,
    core,
    onDropToDimension,
    setIsInlineFlyoutVisible,
    onlyAllowSwitchToSubtypes,
  } = props;

  const isInlineEditing = Boolean(props?.setIsInlineFlyoutVisible);

  const isSaveable = useLensSelector((state) => state.lens.isSaveable);

  const datasourceStates = useLensSelector(selectDatasourceStates);
  const isFullscreen = useLensSelector(selectIsFullscreenDatasource);
  const dateRange = useLensSelector(selectResolvedDateRange);

  useEffect(() => {
    // is undefined when the dimension panel is closed
    setIsInlineFlyoutVisible?.(!openDimension.openColumnId);
  }, [openDimension.openColumnId, setIsInlineFlyoutVisible]);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const settingsPanelRef = useRef<HTMLDivElement | null>(null);

  const registerLayerRef = useCallback(
    (el: HTMLDivElement | null) => registerNewLayerRef(layerId, el),
    [layerId, registerNewLayerRef]
  );

  const closeDimensionEditor = () => {
    if (layerDatasource) {
      if (layerDatasource.updateStateOnCloseDimension) {
        const newState = layerDatasource.updateStateOnCloseDimension({
          state: layerDatasourceState,
          layerId,
          columnId: openColumnId!,
        });
        if (newState) {
          props.updateDatasource(datasourceId, newState);
        }
      }
    }

    setOpenDimension({});
    if (isFullscreen) {
      toggleFullscreen();
    }
  };

  const layerVisualizationConfigProps = {
    layerId,
    state: props.visualizationState,
    frame: props.framePublicAPI,
    dateRange,
    activeData: props.framePublicAPI.activeData,
  };

  const datasourcePublicAPI = framePublicAPI.datasourceLayers?.[layerId];
  const datasourceId = datasourcePublicAPI?.datasourceId;
  let layerDatasourceState = datasourceId ? datasourceStates?.[datasourceId]?.state : undefined;
  // try again with aliases
  if (!layerDatasourceState && datasourcePublicAPI?.datasourceAliasIds && datasourceStates) {
    const aliasId = datasourcePublicAPI.datasourceAliasIds.find(
      (id) => datasourceStates?.[id]?.state
    );
    if (aliasId) {
      layerDatasourceState = datasourceStates[aliasId].state;
    }
  }
  const layerDatasource = datasourceId ? props.datasourceMap[datasourceId] : undefined;

  const layerDatasourceConfigProps = {
    state: layerDatasourceState,
    setState: (newState: unknown) => {
      updateDatasource(datasourceId, newState);
    },
    layerId,
    frame: props.framePublicAPI,
    dateRange,
  };

  const columnLabelMap =
    !layerDatasource && activeVisualization.getUniqueLabels
      ? activeVisualization.getUniqueLabels(props.visualizationState)
      : layerDatasource?.uniqueLabels?.(
          layerDatasourceConfigProps?.state,
          framePublicAPI.dataViews.indexPatterns
        );

  const isEmptyLayer = !dimensionGroups.some((d) => d.accessors.length > 0);
  const { openColumnId, openColumnGroup, isComplete } = openDimension;

  useEffect(() => {
    if (!openColumnId) {
      return;
    }

    const derivedOpenColumnGroup = dimensionGroups.find((group) =>
      group.accessors.some((a) => a.columnId === openColumnId)
    );
    // dont update if nothing has changed
    if (
      isComplete === !!derivedOpenColumnGroup &&
      derivedOpenColumnGroup?.groupId === openColumnGroup?.groupId
    ) {
      return;
    }
    if (derivedOpenColumnGroup) {
      // if column is found, mark it as complete. If it's moved to another group, update the group
      setOpenDimension({
        openColumnId,
        openColumnGroup: derivedOpenColumnGroup,
        isComplete: !!derivedOpenColumnGroup,
      });
    }
    // if column is not found but is not new (is complete), close the dimension panel
    if (isComplete && !derivedOpenColumnGroup) {
      setOpenDimension({});
    }
  }, [openColumnId, dimensionGroups, isComplete, openColumnGroup?.groupId]);

  const allAccessors = dimensionGroups.flatMap((group) =>
    group.accessors.map((accessor) => accessor.columnId)
  );

  const {
    setNextFocusedId: setNextFocusedButtonId,
    removeRef: removeButtonRef,
    registerNewRef: registerNewButtonRef,
  } = useFocusUpdate(allAccessors);

  const onDrop = useCallback(
    (source: DragDropIdentifier, target: DragDropIdentifier, dropType?: DropType) => {
      if (!dropType) {
        return;
      }
      if (!isOperation(target)) {
        throw new Error('Drop target should be an operation');
      }

      if (dropType === 'reorder' || dropType === 'field_replace' || dropType === 'field_add') {
        setNextFocusedButtonId(source.id);
      } else {
        setNextFocusedButtonId(target.columnId);
      }

      onDropToDimension({ source, target, dropType });
    },
    [setNextFocusedButtonId, onDropToDimension]
  );

  const isDimensionPanelOpen = Boolean(openColumnId);

  const updateDataLayerState = useCallback(
    (
      newState: unknown,
      {
        isDimensionComplete = true,
        // this flag is a hack to force a sync render where it was planned an async/setTimeout state update
        // TODO: revisit this once we get rid of updateDatasourceAsync upstream
        forceRender = false,
      }: { isDimensionComplete?: boolean; forceRender?: boolean } = {}
    ) => {
      if (!openColumnGroup || !openColumnId) {
        return;
      }
      if (allAccessors.includes(openColumnId)) {
        if (isDimensionComplete) {
          if (forceRender) {
            updateDatasource(datasourceId, newState);
          } else {
            updateDatasourceAsync(datasourceId, newState);
          }
        } else {
          // The datasource can indicate that the previously-valid column is no longer
          // complete, which clears the visualization. This keeps the flyout open and reuses
          // the previous columnId
          props.updateDatasource(datasourceId, newState);
          props.onRemoveDimension({ layerId, columnId: openColumnId });
        }
      } else if (isDimensionComplete) {
        updateAll(
          datasourceId,
          newState,
          activeVisualization.setDimension({
            layerId,
            groupId: openColumnGroup.groupId,
            columnId: openColumnId,
            prevState: visualizationState,
            frame: framePublicAPI,
          })
        );
      } else {
        if (forceRender) {
          updateDatasource(datasourceId, newState);
        } else {
          updateDatasourceAsync(datasourceId, newState);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      openDimension,
      openColumnGroup,
      openColumnId,
      activeVisualization,
      datasourceId,
      layerId,
      updateAll,
      updateDatasourceAsync,
      visualizationState,
      framePublicAPI,
    ]
  );

  const { dataViews } = props.framePublicAPI;
  const [datasource] = Object.values(framePublicAPI.datasourceLayers);
  const isTextBasedLanguage = Boolean(datasource?.isTextBasedLanguage());

  const visualizationLayerSettings = useMemo(
    () =>
      activeVisualization.hasLayerSettings?.({
        layerId,
        state: visualizationState,
        frame: props.framePublicAPI,
      }) || { data: false, appearance: false },
    [activeVisualization, layerId, props.framePublicAPI, visualizationState]
  );

  const compatibleActions = useMemo<LayerAction[]>(
    () =>
      [
        ...(activeVisualization
          .getSupportedActionsForLayer?.(
            layerId,
            visualizationState,
            updateVisualization,
            props.registerLibraryAnnotationGroup,
            isSaveable
          )
          .map((action) => ({
            ...action,
            execute: () => {
              action.execute(layerActionsFlyoutRef.current);
            },
          })) || []),

        ...getSharedActions({
          layerId,
          activeVisualization,
          core,
          layerIndex,
          layerType: activeVisualization.getLayerType(layerId, visualizationState),
          isOnlyLayer,
          isTextBasedLanguage,
          hasLayerSettings: Boolean(
            (Object.values(visualizationLayerSettings).some(Boolean) &&
              activeVisualization.LayerSettingsComponent) ||
              layerDatasource?.LayerSettingsComponent
          ),
          openLayerSettings: () => setPanelSettingsOpen(true),
          onCloneLayer,
          onRemoveLayer: () => onRemoveLayer(layerId),
          customRemoveModalText: activeVisualization.getCustomRemoveLayerText?.(
            layerId,
            visualizationState
          ),
        }),
      ].filter((i) => i.isCompatible),
    [
      activeVisualization,
      layerId,
      visualizationState,
      updateVisualization,
      props.registerLibraryAnnotationGroup,
      isSaveable,
      core,
      layerIndex,
      isOnlyLayer,
      isTextBasedLanguage,
      visualizationLayerSettings,
      layerDatasource?.LayerSettingsComponent,
      onCloneLayer,
      onRemoveLayer,
    ]
  );
  const layerActionsFlyoutRef = useRef<HTMLDivElement | null>(null);

  return (
    <>
      <section
        tabIndex={-1}
        ref={registerLayerRef}
        className="lnsLayerPanel"
        data-test-subj={`lns-layerPanel-${layerIndex}`}
      >
        <EuiPanel paddingSize="none">
          <header className="lnsLayerPanel__layerHeader">
            <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
              <EuiFlexItem grow className="lnsLayerPanel__layerSettingsWrapper">
                <LayerHeader
                  layerConfigProps={{
                    ...layerVisualizationConfigProps,
                    setState: props.updateVisualization,
                    onChangeIndexPattern: (indexPatternId) =>
                      onChangeIndexPattern({
                        indexPatternId,
                        layerId,
                        visualizationId: activeVisualization.id,
                      }),
                  }}
                  activeVisualizationId={activeVisualization.id}
                  visualizationMap={visualizationMap}
                  datasourceMap={datasourceMap}
                  onlyAllowSwitchToSubtypes={onlyAllowSwitchToSubtypes}
                />
              </EuiFlexItem>
              {props.displayLayerSettings && (
                <EuiFlexItem grow={false}>
                  <LayerActions
                    actions={compatibleActions}
                    layerIndex={layerIndex}
                    mountingPoint={layerActionsFlyoutRef.current}
                  />
                  <div ref={layerActionsFlyoutRef} />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
            {props.indexPatternService &&
              !isTextBasedLanguage &&
              (layerDatasource || activeVisualization.LayerPanelComponent) && (
                <EuiSpacer size="s" />
              )}
            {layerDatasource && props.indexPatternService && (
              <layerDatasource.LayerPanelComponent
                {...{
                  layerId,
                  state: layerDatasourceState,
                  activeData: props.framePublicAPI.activeData,
                  dataViews,
                  onChangeIndexPattern: (indexPatternId) =>
                    onChangeIndexPattern({ indexPatternId, layerId, datasourceId }),
                }}
              />
            )}
            {activeVisualization.LayerPanelComponent && (
              <activeVisualization.LayerPanelComponent
                {...{
                  layerId,
                  state: visualizationState,
                  frame: framePublicAPI,
                  setState: props.updateVisualization,
                  onChangeIndexPattern: (indexPatternId) =>
                    onChangeIndexPattern({
                      indexPatternId,
                      layerId,
                      visualizationId: activeVisualization.id,
                    }),
                }}
              />
            )}
          </header>

          {dimensionGroups
            .filter((group) => !group.isHidden)
            .map((group, groupIndex) => {
              let errorText: string = '';

              if (!isEmptyLayer || isInlineEditing) {
                if (
                  group.requiredMinDimensionCount &&
                  group.requiredMinDimensionCount > group.accessors.length
                ) {
                  if (group.requiredMinDimensionCount > 1) {
                    errorText = i18n.translate(
                      'xpack.lens.editorFrame.requiresTwoOrMoreFieldsWarningLabel',
                      {
                        defaultMessage: 'Requires {requiredMinDimensionCount} fields',
                        values: {
                          requiredMinDimensionCount: group.requiredMinDimensionCount,
                        },
                      }
                    );
                  } else {
                    errorText = i18n.translate('xpack.lens.editorFrame.requiresFieldWarningLabel', {
                      defaultMessage: 'Requires field',
                    });
                  }
                } else if (group.dimensionsTooMany && group.dimensionsTooMany > 0) {
                  errorText = i18n.translate(
                    'xpack.lens.editorFrame.tooManyDimensionsSingularWarningLabel',
                    {
                      defaultMessage:
                        'Please remove {dimensionsTooMany, plural, one {a dimension} other {{dimensionsTooMany} dimensions}}',
                      values: {
                        dimensionsTooMany: group.dimensionsTooMany,
                      },
                    }
                  );
                }
              }
              const isOptional = !group.requiredMinDimensionCount && !group.suggestedValue;
              return (
                <EuiFormRow
                  className="lnsLayerPanel__row"
                  fullWidth
                  label={
                    <>
                      {group.groupLabel}
                      {group.groupTooltip && (
                        <>
                          <EuiIconTip
                            color="subdued"
                            content={group.groupTooltip}
                            iconProps={{
                              className: 'eui-alignTop',
                            }}
                            position="top"
                            size="s"
                            type="questionInCircle"
                          />
                        </>
                      )}
                    </>
                  }
                  labelAppend={
                    isOptional ? (
                      <EuiText color="subdued" size="xs" data-test-subj="lnsGroup_optional">
                        {i18n.translate('xpack.lens.editorFrame.optionalDimensionLabel', {
                          defaultMessage: 'Optional',
                        })}
                      </EuiText>
                    ) : null
                  }
                  labelType="legend"
                  key={group.groupId}
                  isInvalid={Boolean(errorText)}
                  error={errorText}
                >
                  <>
                    {group.accessors.length ? (
                      <ReorderProvider
                        className={'lnsLayerPanel__group'}
                        dataTestSubj="lnsDragDrop"
                      >
                        {group.accessors.map((accessorConfig, accessorIndex) => {
                          const { columnId } = accessorConfig;

                          const messages =
                            props?.getUserMessages?.('dimensionButton', {
                              dimensionId: columnId,
                            }) ?? [];
                          const firstMessage = messages.at(0);

                          return (
                            <DraggableDimensionButton
                              activeVisualization={activeVisualization}
                              registerNewButtonRef={registerNewButtonRef}
                              order={[2, layerIndex, groupIndex, accessorIndex]}
                              target={{
                                id: columnId,
                                layerId,
                                columnId,
                                groupId: group.groupId,
                                filterOperations: group.filterOperations,
                                prioritizedOperation: group.prioritizedOperation,
                                isMetricDimension: group?.isMetricDimension,
                                indexPatternId: layerDatasource
                                  ? layerDatasource.getUsedDataView(layerDatasourceState, layerId)
                                  : activeVisualization.getUsedDataView?.(
                                      visualizationState,
                                      layerId
                                    ),
                                humanData: {
                                  label: columnLabelMap?.[columnId] ?? '',
                                  groupLabel: group.groupLabel,
                                  position: accessorIndex + 1,
                                  layerNumber: layerIndex + 1,
                                },
                              }}
                              group={group}
                              key={columnId}
                              state={layerDatasourceState}
                              layerDatasource={layerDatasource}
                              datasourceLayers={framePublicAPI.datasourceLayers}
                              onDrop={onDrop}
                              indexPatterns={dataViews.indexPatterns}
                            >
                              <DimensionButton
                                accessorConfig={accessorConfig}
                                label={columnLabelMap?.[accessorConfig.columnId] ?? ''}
                                groupLabel={group.groupLabel}
                                onClick={(id: string) => {
                                  setOpenDimension({
                                    openColumnGroup: group,
                                    openColumnId: id,
                                  });
                                }}
                                onRemoveClick={(id: string) => {
                                  props.onRemoveDimension({ columnId: id, layerId });
                                  removeButtonRef(id);
                                }}
                                message={
                                  firstMessage
                                    ? {
                                        severity: firstMessage.severity,
                                        content:
                                          firstMessage.shortMessage ||
                                          (typeof firstMessage.longMessage === 'function'
                                            ? firstMessage.longMessage()
                                            : firstMessage.longMessage),
                                      }
                                    : undefined
                                }
                              >
                                {layerDatasource ? (
                                  <>
                                    {layerDatasource.DimensionTriggerComponent({
                                      ...layerDatasourceConfigProps,
                                      columnId: accessorConfig.columnId,
                                      groupId: group.groupId,
                                      filterOperations: group.filterOperations,
                                      indexPatterns: dataViews.indexPatterns,
                                    })}
                                  </>
                                ) : (
                                  <>
                                    {activeVisualization?.DimensionTriggerComponent?.({
                                      columnId,
                                      label: columnLabelMap?.[columnId] ?? '',
                                    })}
                                  </>
                                )}
                              </DimensionButton>
                            </DraggableDimensionButton>
                          );
                        })}
                      </ReorderProvider>
                    ) : null}

                    {group.fakeFinalAccessor && (
                      <FakeDimensionButton label={group.fakeFinalAccessor.label} />
                    )}

                    {group.supportsMoreColumns ? (
                      <EmptyDimensionButton
                        activeVisualization={activeVisualization}
                        order={[2, layerIndex, groupIndex, group.accessors.length]}
                        group={group}
                        target={{
                          layerId,
                          groupId: group.groupId,
                          filterOperations: group.filterOperations,
                          prioritizedOperation: group.prioritizedOperation,
                          isNewColumn: true,
                          isMetricDimension: group?.isMetricDimension,
                          indexPatternId: layerDatasource
                            ? layerDatasource.getUsedDataView(layerDatasourceState, layerId)
                            : activeVisualization.getUsedDataView?.(visualizationState, layerId),
                          humanData: {
                            groupLabel: group.groupLabel,
                            layerNumber: layerIndex + 1,
                            position: group.accessors.length + 1,
                            label: i18n.translate('xpack.lens.indexPattern.emptyDimensionButton', {
                              defaultMessage: 'Empty dimension',
                            }),
                          },
                        }}
                        layerDatasource={layerDatasource}
                        state={layerDatasourceState}
                        datasourceLayers={framePublicAPI.datasourceLayers}
                        onClick={(id) => {
                          props.onEmptyDimensionAdd(id, group);
                          setOpenDimension({
                            openColumnGroup: group,
                            openColumnId: id,
                          });
                        }}
                        onDrop={onDrop}
                        indexPatterns={dataViews.indexPatterns}
                      />
                    ) : null}
                  </>
                </EuiFormRow>
              );
            })}
        </EuiPanel>
      </section>
      {(layerDatasource?.LayerSettingsComponent || activeVisualization?.LayerSettingsComponent) && (
        <FlyoutContainer
          panelRef={(el) => (settingsPanelRef.current = el)}
          isFullscreen={false}
          label={i18n.translate('xpack.lens.editorFrame.layerSettingsTitle', {
            defaultMessage: 'Layer settings',
          })}
          isOpen={isPanelSettingsOpen}
          handleClose={() => {
            setPanelSettingsOpen(false);
          }}
          isInlineEditing={isInlineEditing}
        >
          <div id={layerId}>
            <div className="lnsIndexPatternDimensionEditor--padded">
              {layerDatasource?.LayerSettingsComponent || visualizationLayerSettings.data ? (
                <EuiText
                  size="s"
                  css={css`
                    margin-bottom: ${euiThemeVars.euiSize};
                  `}
                >
                  <h4>
                    {i18n.translate('xpack.lens.editorFrame.layerSettings.headingData', {
                      defaultMessage: 'Data',
                    })}
                  </h4>
                </EuiText>
              ) : null}
              {layerDatasource?.LayerSettingsComponent && (
                <layerDatasource.LayerSettingsComponent {...layerDatasourceConfigProps} />
              )}
              {layerDatasource?.LayerSettingsComponent && visualizationLayerSettings.data ? (
                <EuiSpacer size="m" />
              ) : null}
              {activeVisualization?.LayerSettingsComponent && visualizationLayerSettings.data ? (
                <activeVisualization.LayerSettingsComponent
                  {...{
                    ...layerVisualizationConfigProps,
                    setState: props.updateVisualization,
                    panelRef: settingsPanelRef,
                    section: 'data',
                  }}
                />
              ) : null}
              {visualizationLayerSettings.appearance ? (
                <EuiText
                  size="s"
                  css={css`
                    margin-bottom: ${euiThemeVars.euiSize};
                  `}
                >
                  <h4>
                    {i18n.translate('xpack.lens.editorFrame.layerSettings.headingAppearance', {
                      defaultMessage: 'Appearance',
                    })}
                  </h4>
                </EuiText>
              ) : null}
              {activeVisualization?.LayerSettingsComponent && (
                <activeVisualization.LayerSettingsComponent
                  {...{
                    ...layerVisualizationConfigProps,
                    setState: props.updateVisualization,
                    panelRef: settingsPanelRef,
                    section: 'appearance',
                  }}
                />
              )}
            </div>
          </div>
        </FlyoutContainer>
      )}
      <DimensionContainer
        panelRef={(el) => (panelRef.current = el)}
        isOpen={isDimensionPanelOpen}
        isFullscreen={isFullscreen}
        label={openColumnGroup?.dimensionEditorGroupLabel ?? (openColumnGroup?.groupLabel || '')}
        isInlineEditing={isInlineEditing}
        handleClose={closeDimensionEditor}
        panel={
          <>
            {openColumnGroup &&
              openColumnId &&
              layerDatasource &&
              layerDatasource.DimensionEditorComponent({
                ...layerDatasourceConfigProps,
                core: props.core,
                columnId: openColumnId,
                groupId: openColumnGroup.groupId,
                hideGrouping: openColumnGroup.hideGrouping,
                filterOperations: openColumnGroup.filterOperations,
                isMetricDimension: openColumnGroup?.isMetricDimension,
                dimensionGroups,
                toggleFullscreen,
                isFullscreen,
                setState: updateDataLayerState,
                supportStaticValue: Boolean(openColumnGroup.supportStaticValue),
                paramEditorCustomProps: openColumnGroup.paramEditorCustomProps,
                enableFormatSelector: openColumnGroup.enableFormatSelector !== false,
                layerType: activeVisualization.getLayerType(layerId, visualizationState),
                indexPatterns: dataViews.indexPatterns,
                activeData: layerVisualizationConfigProps.activeData,
                dataSectionExtra: !isFullscreen &&
                  openDimension.isComplete &&
                  activeVisualization.DimensionEditorDataExtraComponent && (
                    <activeVisualization.DimensionEditorDataExtraComponent
                      {...{
                        ...layerVisualizationConfigProps,
                        groupId: openColumnGroup.groupId,
                        accessor: openColumnId,
                        datasource,
                        setState: props.updateVisualization,
                        addLayer: props.addLayer,
                        removeLayer: props.onRemoveLayer,
                        panelRef,
                      }}
                    />
                  ),
              })}
            {openColumnGroup &&
              openColumnId &&
              !isFullscreen &&
              openDimension.isComplete &&
              activeVisualization.DimensionEditorComponent &&
              openColumnGroup?.enableDimensionEditor && (
                <>
                  <div className="lnsLayerPanel__styleEditor">
                    <activeVisualization.DimensionEditorComponent
                      {...{
                        ...layerVisualizationConfigProps,
                        groupId: openColumnGroup.groupId,
                        accessor: openColumnId,
                        datasource,
                        setState: props.updateVisualization,
                        addLayer: props.addLayer,
                        removeLayer: props.onRemoveLayer,
                        panelRef,
                        isInlineEditing,
                      }}
                    />
                  </div>
                  {activeVisualization.DimensionEditorAdditionalSectionComponent && (
                    <activeVisualization.DimensionEditorAdditionalSectionComponent
                      {...{
                        ...layerVisualizationConfigProps,
                        groupId: openColumnGroup.groupId,
                        accessor: openColumnId,
                        datasource,
                        setState: props.updateVisualization,
                        addLayer: props.addLayer,
                        removeLayer: props.onRemoveLayer,
                        panelRef,
                      }}
                    />
                  )}
                </>
              )}
          </>
        }
      />
    </>
  );
}
