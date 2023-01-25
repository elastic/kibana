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
import { LayerType } from '../../../../common';
import { LayerActions } from './layer_actions';
import { IndexPatternServiceAPI } from '../../../data_views_service/service';
import { NativeRenderer } from '../../../native_renderer';
import {
  StateSetter,
  Visualization,
  DragDropOperation,
  DropType,
  isOperation,
  LayerAction,
  VisualizationDimensionGroupConfig,
  UserMessagesGetter,
} from '../../../types';
import { DragDropIdentifier, ReorderProvider } from '../../../drag_drop';
import { LayerSettings } from './layer_settings';
import { LayerPanelProps, ActiveDimensionState } from './types';
import { DimensionContainer } from './dimension_container';
import { EmptyDimensionButton } from './buttons/empty_dimension_button';
import { DimensionButton } from './buttons/dimension_button';
import { DraggableDimensionButton } from './buttons/draggable_dimension_button';
import { useFocusUpdate } from './use_focus_update';
import {
  useLensSelector,
  selectIsFullscreenDatasource,
  selectResolvedDateRange,
  selectDatasourceStates,
} from '../../../state_management';
import { onDropForVisualization, shouldRemoveSource } from './buttons/drop_targets_utils';
import { getSharedActions } from './layer_actions/layer_actions';
import { FlyoutContainer } from './flyout_container';

// hide the random sampling settings from the UI
const DISPLAY_RANDOM_SAMPLING_SETTINGS = false;

const initialActiveDimensionState = {
  isNew: false,
};

export function LayerPanel(
  props: Exclude<LayerPanelProps, 'state' | 'setState'> & {
    activeVisualization: Visualization;
    dimensionGroups: VisualizationDimensionGroupConfig[];
    layerId: string;
    layerIndex: number;
    isOnlyLayer: boolean;
    addLayer: (layerType: LayerType) => void;
    updateVisualization: StateSetter<unknown>;
    updateDatasource: (
      datasourceId: string | undefined,
      newState: unknown,
      dontSyncLinkedDimensions?: boolean
    ) => void;
    updateDatasourceAsync: (datasourceId: string | undefined, newState: unknown) => void;
    updateAll: (
      datasourceId: string | undefined,
      newDatasourcestate: unknown,
      newVisualizationState: unknown
    ) => void;
    onRemoveLayer: (layerId: string) => void;
    onCloneLayer: () => void;
    onRemoveDimension: (props: { columnId: string; layerId: string }) => void;
    registerNewLayerRef: (layerId: string, instance: HTMLDivElement | null) => void;
    toggleFullscreen: () => void;
    onEmptyDimensionAdd: (columnId: string, group: { groupId: string }) => void;
    onChangeIndexPattern: (args: {
      indexPatternId: string;
      layerId: string;
      datasourceId?: string;
      visualizationId?: string;
    }) => void;
    indexPatternService: IndexPatternServiceAPI;
    getUserMessages: UserMessagesGetter;
  }
) {
  const [activeDimension, setActiveDimension] = useState<ActiveDimensionState>(
    initialActiveDimensionState
  );
  const [isPanelSettingsOpen, setPanelSettingsOpen] = useState(false);

  const [hideTooltip, setHideTooltip] = useState<boolean>(false);

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
    updateVisualization,
    updateDatasource,
    toggleFullscreen,
    updateAll,
    updateDatasourceAsync,
    visualizationState,
    onChangeIndexPattern,
    core,
  } = props;

  const datasourceStates = useLensSelector(selectDatasourceStates);
  const isFullscreen = useLensSelector(selectIsFullscreenDatasource);
  const dateRange = useLensSelector(selectResolvedDateRange);

  useEffect(() => {
    setActiveDimension(initialActiveDimensionState);
  }, [activeVisualization.id]);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const settingsPanelRef = useRef<HTMLDivElement | null>(null);
  const registerLayerRef = useCallback(
    (el) => registerNewLayerRef(layerId, el),
    [layerId, registerNewLayerRef]
  );

  const layerVisualizationConfigProps = {
    layerId,
    state: props.visualizationState,
    frame: props.framePublicAPI,
    dateRange,
    activeData: props.framePublicAPI.activeData,
  };

  const datasourcePublicAPI = framePublicAPI.datasourceLayers?.[layerId];
  const datasourceId = datasourcePublicAPI?.datasourceId;
  const layerDatasourceState = datasourceId ? datasourceStates?.[datasourceId]?.state : undefined;
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
      : layerDatasource?.uniqueLabels?.(layerDatasourceConfigProps?.state);

  const isEmptyLayer = !dimensionGroups.some((d) => d.accessors.length > 0);
  const { activeId, activeGroup } = activeDimension;

  const allAccessors = dimensionGroups.flatMap((group) =>
    group.accessors.map((accessor) => accessor.columnId)
  );

  const {
    setNextFocusedId: setNextFocusedButtonId,
    removeRef: removeButtonRef,
    registerNewRef: registerNewButtonRef,
  } = useFocusUpdate(allAccessors);

  const onDrop = useMemo(() => {
    return (source: DragDropIdentifier, target: DragDropIdentifier, dropType?: DropType) => {
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

      let hasDropSucceeded = true;
      if (layerDatasource) {
        hasDropSucceeded = Boolean(
          layerDatasource?.onDrop({
            state: layerDatasourceState,
            setState: (newState: unknown) => {
              // we don't sync linked dimension here because that would trigger an onDrop routine within an onDrop routine
              updateDatasource(datasourceId, newState, true);
            },
            source,
            target: {
              ...(target as unknown as DragDropOperation),
              filterOperations:
                dimensionGroups.find(({ groupId: gId }) => gId === target.groupId)
                  ?.filterOperations || Boolean,
            },
            targetLayerDimensionGroups: dimensionGroups,
            dropType,
            indexPatterns: framePublicAPI.dataViews.indexPatterns,
          })
        );
      }
      if (hasDropSucceeded) {
        activeVisualization.onDrop = activeVisualization.onDrop?.bind(activeVisualization);

        updateVisualization(
          (activeVisualization.onDrop || onDropForVisualization)?.(
            {
              prevState: props.visualizationState,
              frame: framePublicAPI,
              target,
              source,
              dropType,
              group: dimensionGroups.find(({ groupId: gId }) => gId === target.groupId),
            },
            activeVisualization
          )
        );

        if (isOperation(source) && shouldRemoveSource(source, dropType)) {
          props.onRemoveDimension({
            columnId: source.columnId,
            layerId: source.layerId,
          });
        }
      }
    };
  }, [
    layerDatasource,
    setNextFocusedButtonId,
    layerDatasourceState,
    dimensionGroups,
    framePublicAPI,
    updateDatasource,
    datasourceId,
    activeVisualization,
    updateVisualization,
    props,
  ]);

  const isDimensionPanelOpen = Boolean(activeId);

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
      if (!activeGroup || !activeId) {
        return;
      }
      if (allAccessors.includes(activeId)) {
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
          props.onRemoveDimension({ layerId, columnId: activeId });
        }
      } else if (isDimensionComplete) {
        updateAll(
          datasourceId,
          newState,
          activeVisualization.setDimension({
            layerId,
            groupId: activeGroup.groupId,
            columnId: activeId,
            prevState: visualizationState,
            frame: framePublicAPI,
          })
        );
        setActiveDimension({ ...activeDimension, isNew: false });
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
      activeDimension,
      activeGroup,
      activeId,
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

  const compatibleActions = useMemo<LayerAction[]>(
    () =>
      [
        ...(activeVisualization
          .getSupportedActionsForLayer?.(layerId, visualizationState)
          .map((action) => ({
            ...action,
            execute: () => {
              updateVisualization(
                activeVisualization.onLayerAction?.(layerId, action.id, visualizationState)
              );
            },
          })) || []),
        ...getSharedActions({
          layerId,
          activeVisualization,
          visualizationState,
          core,
          layerIndex,
          layerType: activeVisualization.getLayerType(layerId, visualizationState),
          isOnlyLayer,
          isTextBasedLanguage,
          hasLayerSettings: Boolean(
            (activeVisualization.hasLayerSettings?.({
              layerId,
              state: visualizationState,
              frame: props.framePublicAPI,
            }) &&
              activeVisualization.renderLayerSettings) ||
              (layerDatasource?.renderLayerSettings && DISPLAY_RANDOM_SAMPLING_SETTINGS)
          ),
          openLayerSettings: () => setPanelSettingsOpen(true),
          onCloneLayer,
          onRemoveLayer: () => onRemoveLayer(layerId),
        }),
      ].filter((i) => i.isCompatible),
    [
      activeVisualization,
      core,
      isOnlyLayer,
      isTextBasedLanguage,
      layerDatasource?.renderLayerSettings,
      layerId,
      layerIndex,
      onCloneLayer,
      onRemoveLayer,
      props.framePublicAPI,
      updateVisualization,
      visualizationState,
    ]
  );

  return (
    <>
      <section tabIndex={-1} ref={registerLayerRef} className="lnsLayerPanel">
        <EuiPanel data-test-subj={`lns-layerPanel-${layerIndex}`} paddingSize="none">
          <header className="lnsLayerPanel__layerHeader">
            <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
              <EuiFlexItem grow className="lnsLayerPanel__layerSettingsWrapper">
                <LayerSettings
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
                  activeVisualization={activeVisualization}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <LayerActions actions={compatibleActions} layerIndex={layerIndex} />
              </EuiFlexItem>
            </EuiFlexGroup>
            {(layerDatasource || activeVisualization.renderLayerPanel) && <EuiSpacer size="s" />}
            {layerDatasource && (
              <NativeRenderer
                render={layerDatasource.renderLayerPanel}
                nativeProps={{
                  layerId,
                  state: layerDatasourceState,
                  activeData: props.framePublicAPI.activeData,
                  dataViews,
                  onChangeIndexPattern: (indexPatternId) =>
                    onChangeIndexPattern({ indexPatternId, layerId, datasourceId }),
                }}
              />
            )}
            {activeVisualization.renderLayerPanel && (
              <NativeRenderer
                render={activeVisualization.renderLayerPanel}
                nativeProps={{
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

          {dimensionGroups.map((group, groupIndex) => {
            let errorText: string = '';

            if (!isEmptyLayer) {
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
                    <ReorderProvider id={group.groupId} className={'lnsLayerPanel__group'}>
                      {group.accessors.map((accessorConfig, accessorIndex) => {
                        const { columnId } = accessorConfig;

                        const messages = props.getUserMessages('dimensionTrigger', {
                          dimensionId: columnId,
                        });

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
                            onDragStart={() => setHideTooltip(true)}
                            onDragEnd={() => setHideTooltip(false)}
                            onDrop={onDrop}
                            indexPatterns={dataViews.indexPatterns}
                          >
                            <div className="lnsLayerPanel__dimension">
                              <DimensionButton
                                accessorConfig={accessorConfig}
                                label={columnLabelMap?.[accessorConfig.columnId] ?? ''}
                                group={group}
                                onClick={(id: string) => {
                                  setActiveDimension({
                                    isNew: false,
                                    activeGroup: group,
                                    activeId: id,
                                  });
                                }}
                                onRemoveClick={(id: string) => {
                                  props.onRemoveDimension({ columnId: id, layerId });
                                  removeButtonRef(id);
                                }}
                                message={messages[0]}
                              >
                                {layerDatasource ? (
                                  <NativeRenderer
                                    render={layerDatasource.renderDimensionTrigger}
                                    nativeProps={{
                                      ...layerDatasourceConfigProps,
                                      columnId: accessorConfig.columnId,
                                      groupId: group.groupId,
                                      filterOperations: group.filterOperations,
                                      indexPatterns: dataViews.indexPatterns,
                                    }}
                                  />
                                ) : (
                                  <>
                                    {activeVisualization?.renderDimensionTrigger?.({
                                      columnId,
                                      label: columnLabelMap?.[columnId] ?? '',
                                      hideTooltip,
                                    })}
                                  </>
                                )}
                              </DimensionButton>
                            </div>
                          </DraggableDimensionButton>
                        );
                      })}
                    </ReorderProvider>
                  ) : null}

                  {group.fakeFinalAccessor && (
                    <div
                      className="lnsLayerPanel__dimension lnsDragDrop-isDraggable"
                      css={css`
                        cursor: default !important;
                        border-color: transparent !important;
                        margin-top: ${group.accessors.length ? 8 : 0}px !important;
                        background-color: ${euiThemeVars.euiColorLightShade} !important;
                        box-shadow: none !important;
                      `}
                    >
                      <EuiText
                        size="s"
                        className="lnsLayerPanel__triggerText"
                        data-test-subj="lns-fakeDimension"
                        color={'subdued'}
                      >
                        <span className="lnsLayerPanel__triggerTextLabel">
                          {group.fakeFinalAccessor.label}
                        </span>
                      </EuiText>
                    </div>
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
                        setActiveDimension({
                          activeGroup: group,
                          activeId: id,
                          isNew: !group.supportStaticValue && Boolean(layerDatasource),
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
      {(layerDatasource?.renderLayerSettings || activeVisualization?.renderLayerSettings) && (
        <FlyoutContainer
          panelRef={(el) => (settingsPanelRef.current = el)}
          isOpen={isPanelSettingsOpen}
          isFullscreen={false}
          groupLabel={i18n.translate('xpack.lens.editorFrame.layerSettingsTitle', {
            defaultMessage: 'Layer settings',
          })}
          handleClose={() => {
            // update the current layer settings
            setPanelSettingsOpen(false);
            return true;
          }}
        >
          <div id={layerId}>
            <div className="lnsIndexPatternDimensionEditor--padded lnsIndexPatternDimensionEditor--collapseNext">
              {layerDatasource?.renderLayerSettings && DISPLAY_RANDOM_SAMPLING_SETTINGS && (
                <>
                  <NativeRenderer
                    render={layerDatasource.renderLayerSettings}
                    nativeProps={layerDatasourceConfigProps}
                  />
                  <EuiSpacer size="m" />
                </>
              )}
              {activeVisualization?.renderLayerSettings && (
                <NativeRenderer
                  render={activeVisualization?.renderLayerSettings}
                  nativeProps={{
                    ...layerVisualizationConfigProps,
                    setState: props.updateVisualization,
                    panelRef: settingsPanelRef,
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
        groupLabel={activeGroup?.dimensionEditorGroupLabel ?? (activeGroup?.groupLabel || '')}
        handleClose={() => {
          if (layerDatasource) {
            if (
              layerDatasource.canCloseDimensionEditor &&
              !layerDatasource.canCloseDimensionEditor(layerDatasourceState)
            ) {
              return false;
            }
            if (layerDatasource.updateStateOnCloseDimension) {
              const newState = layerDatasource.updateStateOnCloseDimension({
                state: layerDatasourceState,
                layerId,
                columnId: activeId!,
              });
              if (newState) {
                props.updateDatasource(datasourceId, newState);
              }
            }
          }

          setActiveDimension(initialActiveDimensionState);
          if (isFullscreen) {
            toggleFullscreen();
          }
          return true;
        }}
        panel={
          <>
            {activeGroup && activeId && layerDatasource && (
              <NativeRenderer
                render={layerDatasource.renderDimensionEditor}
                nativeProps={{
                  ...layerDatasourceConfigProps,
                  core: props.core,
                  columnId: activeId,
                  groupId: activeGroup.groupId,
                  hideGrouping: activeGroup.hideGrouping,
                  filterOperations: activeGroup.filterOperations,
                  isMetricDimension: activeGroup?.isMetricDimension,
                  dimensionGroups,
                  toggleFullscreen,
                  isFullscreen,
                  setState: updateDataLayerState,
                  supportStaticValue: Boolean(activeGroup.supportStaticValue),
                  paramEditorCustomProps: activeGroup.paramEditorCustomProps,
                  enableFormatSelector: activeGroup.enableFormatSelector !== false,
                  formatSelectorOptions: activeGroup.formatSelectorOptions,
                  layerType: activeVisualization.getLayerType(layerId, visualizationState),
                  indexPatterns: dataViews.indexPatterns,
                  activeData: layerVisualizationConfigProps.activeData,
                  dataSectionExtra: !isFullscreen &&
                    !activeDimension.isNew &&
                    activeVisualization.renderDimensionEditorDataExtra && (
                      <NativeRenderer
                        render={activeVisualization.renderDimensionEditorDataExtra}
                        nativeProps={{
                          ...layerVisualizationConfigProps,
                          groupId: activeGroup.groupId,
                          accessor: activeId,
                          datasource,
                          setState: props.updateVisualization,
                          addLayer: props.addLayer,
                          removeLayer: props.onRemoveLayer,
                          panelRef,
                        }}
                      />
                    ),
                }}
              />
            )}
            {activeGroup &&
              activeId &&
              !isFullscreen &&
              !activeDimension.isNew &&
              activeVisualization.renderDimensionEditor &&
              activeGroup?.enableDimensionEditor && (
                <>
                  <div className="lnsLayerPanel__styleEditor">
                    <NativeRenderer
                      render={activeVisualization.renderDimensionEditor}
                      nativeProps={{
                        ...layerVisualizationConfigProps,
                        groupId: activeGroup.groupId,
                        accessor: activeId,
                        datasource,
                        setState: props.updateVisualization,
                        addLayer: props.addLayer,
                        removeLayer: props.onRemoveLayer,
                        panelRef,
                      }}
                    />
                  </div>
                  {activeVisualization.renderDimensionEditorAdditionalSection && (
                    <NativeRenderer
                      render={activeVisualization.renderDimensionEditorAdditionalSection}
                      nativeProps={{
                        ...layerVisualizationConfigProps,
                        groupId: activeGroup.groupId,
                        accessor: activeId,
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
