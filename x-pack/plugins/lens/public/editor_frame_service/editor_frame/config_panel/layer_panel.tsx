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
import { LayerActions } from './layer_actions';
import { IndexPatternServiceAPI } from '../../../data_views_service/service';
import { NativeRenderer } from '../../../native_renderer';
import {
  StateSetter,
  Visualization,
  DragDropOperation,
  DropType,
  isOperation,
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
import { onDropForVisualization } from './buttons/drop_targets_utils';

const initialActiveDimensionState = {
  isNew: false,
};

export function LayerPanel(
  props: Exclude<LayerPanelProps, 'state' | 'setState'> & {
    activeVisualization: Visualization;
    layerId: string;
    layerIndex: number;
    isOnlyLayer: boolean;
    updateVisualization: StateSetter<unknown>;
    updateDatasource: (datasourceId: string | undefined, newState: unknown) => void;
    updateDatasourceAsync: (datasourceId: string | undefined, newState: unknown) => void;
    updateAll: (
      datasourceId: string | undefined,
      newDatasourcestate: unknown,
      newVisualizationState: unknown
    ) => void;
    onRemoveLayer: () => void;
    onCloneLayer: () => void;
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
  }
) {
  const [activeDimension, setActiveDimension] = useState<ActiveDimensionState>(
    initialActiveDimensionState
  );
  const [hideTooltip, setHideTooltip] = useState<boolean>(false);

  const {
    framePublicAPI,
    layerId,
    isOnlyLayer,
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

  const { groups } = useMemo(
    () => activeVisualization.getConfiguration(layerVisualizationConfigProps),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      layerVisualizationConfigProps.frame,
      layerVisualizationConfigProps.state,
      layerId,
      activeVisualization,
    ]
  );

  const columnLabelMap =
    !layerDatasource && activeVisualization.getUniqueLabels
      ? activeVisualization.getUniqueLabels(props.visualizationState)
      : layerDatasource?.uniqueLabels?.(layerDatasourceConfigProps?.state);

  const isEmptyLayer = !groups.some((d) => d.accessors.length > 0);
  const { activeId, activeGroup } = activeDimension;

  const allAccessors = groups.flatMap((group) =>
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
              updateDatasource(datasourceId, newState);
            },
            source,
            target: {
              ...(target as unknown as DragDropOperation),
              filterOperations:
                groups.find(({ groupId: gId }) => gId === target.groupId)?.filterOperations ||
                Boolean,
            },
            dimensionGroups: groups,
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
              group: groups.find(({ groupId: gId }) => gId === target.groupId),
            },
            activeVisualization
          )
        );
      }
    };
  }, [
    layerDatasource,
    setNextFocusedButtonId,
    layerDatasourceState,
    groups,
    updateDatasource,
    datasourceId,
    activeVisualization,
    updateVisualization,
    props.visualizationState,
    framePublicAPI,
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
          updateAll(
            datasourceId,
            newState,
            activeVisualization.removeDimension({
              layerId,
              columnId: activeId,
              prevState: visualizationState,
              frame: framePublicAPI,
            })
          );
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
                <LayerActions
                  layerIndex={layerIndex}
                  isOnlyLayer={isOnlyLayer}
                  activeVisualization={activeVisualization}
                  layerType={activeVisualization.getLayerType(layerId, visualizationState)}
                  onRemoveLayer={onRemoveLayer}
                  onCloneLayer={onCloneLayer}
                  core={core}
                />
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

          {groups.map((group, groupIndex) => {
            let errorText: string = '';

            if (!isEmptyLayer) {
              if (group.requiredMinDimensionCount) {
                errorText = i18n.translate(
                  'xpack.lens.editorFrame.requiresTwoOrMoreFieldsWarningLabel',
                  {
                    defaultMessage: 'Requires {requiredMinDimensionCount} fields',
                    values: {
                      requiredMinDimensionCount: group.requiredMinDimensionCount,
                    },
                  }
                );
              } else if (group.required && group.accessors.length === 0) {
                errorText = i18n.translate('xpack.lens.editorFrame.requiresFieldWarningLabel', {
                  defaultMessage: 'Requires field',
                });
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
            const isOptional = !group.required && !group.suggestedValue;
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
                        return (
                          <DraggableDimensionButton
                            registerNewButtonRef={registerNewButtonRef}
                            columnId={columnId}
                            group={group}
                            accessorIndex={accessorIndex}
                            groupIndex={groupIndex}
                            key={columnId}
                            state={layerDatasourceState}
                            label={columnLabelMap?.[columnId] ?? ''}
                            layerDatasource={layerDatasource}
                            datasourceLayers={framePublicAPI.datasourceLayers}
                            layerIndex={layerIndex}
                            layerId={layerId}
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
                                  if (datasourceId && layerDatasource) {
                                    props.updateAll(
                                      datasourceId,
                                      layerDatasource.removeColumn({
                                        layerId,
                                        columnId: id,
                                        prevState: layerDatasourceState,
                                        indexPatterns: dataViews.indexPatterns,
                                      }),
                                      activeVisualization.removeDimension({
                                        layerId,
                                        columnId: id,
                                        prevState: props.visualizationState,
                                        frame: framePublicAPI,
                                      })
                                    );
                                  } else {
                                    props.updateVisualization(
                                      activeVisualization.removeDimension({
                                        layerId,
                                        columnId: id,
                                        prevState: props.visualizationState,
                                        frame: framePublicAPI,
                                      })
                                    );
                                  }
                                  removeButtonRef(id);
                                }}
                                invalid={
                                  layerDatasource &&
                                  !layerDatasource?.isValidColumn(
                                    layerDatasourceState,
                                    dataViews.indexPatterns,
                                    layerId,
                                    columnId
                                  )
                                }
                              >
                                {layerDatasource ? (
                                  <NativeRenderer
                                    render={layerDatasource.renderDimensionTrigger}
                                    nativeProps={{
                                      ...layerDatasourceConfigProps,
                                      columnId: accessorConfig.columnId,
                                      groupId: group.groupId,
                                      filterOperations: group.filterOperations,
                                      hideTooltip,
                                      invalid: group.invalid,
                                      invalidMessage: group.invalidMessage,
                                      indexPatterns: dataViews.indexPatterns,
                                      existingFields: dataViews.existingFields,
                                    }}
                                  />
                                ) : (
                                  <>
                                    {activeVisualization?.renderDimensionTrigger?.({
                                      columnId,
                                      label: columnLabelMap?.[columnId] ?? '',
                                      hideTooltip,
                                      ...(activeVisualization?.validateColumn?.(
                                        visualizationState,
                                        { dataViews },
                                        layerId,
                                        columnId,
                                        group
                                      ) || { invalid: false }),
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

                  {group.supportsMoreColumns ? (
                    <EmptyDimensionButton
                      group={group}
                      layerId={layerId}
                      groupIndex={groupIndex}
                      layerIndex={layerIndex}
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
                  dimensionGroups: groups,
                  toggleFullscreen,
                  isFullscreen,
                  setState: updateDataLayerState,
                  supportStaticValue: Boolean(activeGroup.supportStaticValue),
                  paramEditorCustomProps: activeGroup.paramEditorCustomProps,
                  enableFormatSelector: activeGroup.enableFormatSelector !== false,
                  formatSelectorOptions: activeGroup.formatSelectorOptions,
                  layerType: activeVisualization.getLayerType(layerId, visualizationState),
                  indexPatterns: dataViews.indexPatterns,
                  existingFields: dataViews.existingFields,
                  activeData: layerVisualizationConfigProps.activeData,
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
                        setState: props.updateVisualization,
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
                        setState: props.updateVisualization,
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
