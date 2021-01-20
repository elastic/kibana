/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import './layer_panel.scss';

import React, { useContext, useState, useEffect } from 'react';
import {
  EuiPanel,
  EuiSpacer,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { NativeRenderer } from '../../../native_renderer';
import { StateSetter, isDraggedOperation } from '../../../types';
import { DragContext, DragDrop, ChildDragDropProvider, ReorderProvider } from '../../../drag_drop';
import { LayerSettings } from './layer_settings';
import { trackUiEvent } from '../../../lens_ui_telemetry';
import { ConfigPanelWrapperProps, ActiveDimensionState } from './types';
import { DimensionContainer } from './dimension_container';
import { ColorIndicator } from './color_indicator';
import { PaletteIndicator } from './palette_indicator';
import { RemoveLayerButton } from './remove_layer_button';
import { EmptyDimensionButton } from './empty_dimension_button';

const triggerLinkA11yText = (label: string) =>
  i18n.translate('xpack.lens.configure.editConfig', {
    defaultMessage: 'Click to edit configuration for {label} or drag to move',
    values: { label },
  });

const initialActiveDimensionState = {
  isNew: false,
};

function isConfiguration(
  value: unknown
): value is { columnId: string; groupId: string; layerId: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'columnId' in value! &&
    'groupId' in value &&
    'layerId' in value
  );
}

function isSameConfiguration(config1: unknown, config2: unknown) {
  return (
    isConfiguration(config1) &&
    isConfiguration(config2) &&
    config1.columnId === config2.columnId &&
    config1.groupId === config2.groupId &&
    config1.layerId === config2.layerId
  );
}

export function LayerPanel(
  props: Exclude<ConfigPanelWrapperProps, 'state' | 'setState'> & {
    layerId: string;
    layerIndex: number;
    isOnlyLayer: boolean;
    updateVisualization: StateSetter<unknown>;
    updateDatasource: (datasourceId: string, newState: unknown) => void;
    updateAll: (
      datasourceId: string,
      newDatasourcestate: unknown,
      newVisualizationState: unknown
    ) => void;
    onRemoveLayer: () => void;
    setLayerRef: (layerId: string, instance: HTMLDivElement | null) => void;
  }
) {
  const dragDropContext = useContext(DragContext);
  const [activeDimension, setActiveDimension] = useState<ActiveDimensionState>(
    initialActiveDimensionState
  );

  const { framePublicAPI, layerId, isOnlyLayer, onRemoveLayer, setLayerRef, layerIndex } = props;
  const datasourcePublicAPI = framePublicAPI.datasourceLayers[layerId];

  useEffect(() => {
    setActiveDimension(initialActiveDimensionState);
  }, [props.activeVisualizationId]);

  const setLayerRefMemoized = React.useCallback((el) => setLayerRef(layerId, el), [
    layerId,
    setLayerRef,
  ]);

  if (!props.activeVisualizationId || !props.visualizationMap[props.activeVisualizationId]) {
    return null;
  }
  const activeVisualization = props.visualizationMap[props.activeVisualizationId];
  const layerVisualizationConfigProps = {
    layerId,
    dragDropContext,
    state: props.visualizationState,
    frame: props.framePublicAPI,
    dateRange: props.framePublicAPI.dateRange,
    activeData: props.framePublicAPI.activeData,
  };

  const datasourceId = datasourcePublicAPI.datasourceId;
  const layerDatasourceState = props.datasourceStates[datasourceId].state;
  const layerDatasource = props.datasourceMap[datasourceId];

  const layerDatasourceDropProps = {
    layerId,
    dragDropContext,
    state: layerDatasourceState,
    setState: (newState: unknown) => {
      props.updateDatasource(datasourceId, newState);
    },
  };

  const layerDatasourceConfigProps = {
    ...layerDatasourceDropProps,
    frame: props.framePublicAPI,
    dateRange: props.framePublicAPI.dateRange,
    activeData: props.framePublicAPI.activeData,
  };

  const { groups } = activeVisualization.getConfiguration(layerVisualizationConfigProps);
  const isEmptyLayer = !groups.some((d) => d.accessors.length > 0);
  const { activeId, activeGroup } = activeDimension;

  const columnLabelMap = layerDatasource.uniqueLabels(layerDatasourceConfigProps.state);
  return (
    <ChildDragDropProvider {...dragDropContext}>
      <section tabIndex={-1} ref={setLayerRefMemoized} className="lnsLayerPanel">
        <EuiPanel data-test-subj={`lns-layerPanel-${layerIndex}`} paddingSize="s">
          <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
            <EuiFlexItem grow={false} className="lnsLayerPanel__settingsFlexItem">
              <LayerSettings
                layerId={layerId}
                layerConfigProps={{
                  ...layerVisualizationConfigProps,
                  setState: props.updateVisualization,
                }}
                activeVisualization={activeVisualization}
              />
            </EuiFlexItem>

            {layerDatasource && (
              <EuiFlexItem className="lnsLayerPanel__sourceFlexItem">
                <NativeRenderer
                  render={layerDatasource.renderLayerPanel}
                  nativeProps={{
                    layerId,
                    state: layerDatasourceState,
                    activeData: props.framePublicAPI.activeData,
                    setState: (updater: unknown) => {
                      const newState =
                        typeof updater === 'function' ? updater(layerDatasourceState) : updater;
                      // Look for removed columns
                      const nextPublicAPI = layerDatasource.getPublicAPI({
                        state: newState,
                        layerId,
                      });
                      const nextTable = new Set(
                        nextPublicAPI.getTableSpec().map(({ columnId }) => columnId)
                      );
                      const removed = datasourcePublicAPI
                        .getTableSpec()
                        .map(({ columnId }) => columnId)
                        .filter((columnId) => !nextTable.has(columnId));
                      let nextVisState = props.visualizationState;
                      removed.forEach((columnId) => {
                        nextVisState = activeVisualization.removeDimension({
                          layerId,
                          columnId,
                          prevState: nextVisState,
                        });
                      });

                      props.updateAll(datasourceId, newState, nextVisState);
                    },
                  }}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>

          <EuiSpacer size="m" />

          {groups.map((group, groupIndex) => {
            const isMissing = !isEmptyLayer && group.required && group.accessors.length === 0;

            return (
              <EuiFormRow
                className={
                  group.supportsMoreColumns
                    ? 'lnsLayerPanel__row'
                    : 'lnsLayerPanel__row lnsLayerPanel__row--notSupportsMoreColumns'
                }
                fullWidth
                label={<div className="lnsLayerPanel__groupLabel">{group.groupLabel}</div>}
                labelType="legend"
                key={groupIndex}
                isInvalid={isMissing}
                error={
                  isMissing ? (
                    <div className="lnsLayerPanel__error">
                      {i18n.translate('xpack.lens.editorFrame.requiredDimensionWarningLabel', {
                        defaultMessage: 'Required dimension',
                      })}
                    </div>
                  ) : (
                    []
                  )
                }
              >
                <>
                  <ReorderProvider id={group.groupId} className={'lnsLayerPanel__group'}>
                    {group.accessors.map((accessorConfig, accessorIndex) => {
                      const accessor = accessorConfig.columnId;
                      const { dragging } = dragDropContext;
                      const dragType =
                        isDraggedOperation(dragging) && accessor === dragging.columnId
                          ? 'move'
                          : isDraggedOperation(dragging) && group.groupId === dragging.groupId
                          ? 'reorder'
                          : 'copy';

                      const dropType = isDraggedOperation(dragging)
                        ? group.groupId !== dragging.groupId
                          ? 'replace'
                          : 'reorder'
                        : 'add';

                      const isCompatibleFromOtherGroup =
                        dragging?.groupId !== group.groupId &&
                        layerDatasource.canHandleDrop({
                          ...layerDatasourceDropProps,
                          columnId: accessor,
                          filterOperations: group.filterOperations,
                        });

                      const isFromTheSameGroup =
                        isDraggedOperation(dragging) &&
                        dragging.groupId === group.groupId &&
                        dragging.columnId !== accessor;

                      const isFromNotCompatibleGroup =
                        !isFromTheSameGroup &&
                        !isCompatibleFromOtherGroup &&
                        layerDatasource.canHandleDrop({
                          ...layerDatasourceDropProps,
                          columnId: accessor,
                          filterOperations: group.filterOperations,
                        });

                      const isDroppable = isDraggedOperation(dragging)
                        ? dragType === 'reorder'
                          ? isFromTheSameGroup
                          : isCompatibleFromOtherGroup
                        : isFromNotCompatibleGroup;

                      return (
                        <DragDrop
                          getAdditionalClassesOnEnter={() => {
                            if (isCompatibleFromOtherGroup) return 'lnsDragDrop-notCompatible';
                            return '';
                          }}
                          className="lnsLayerPanel__dimensionContainer"
                          key={accessor}
                          order={[2, layerIndex, groupIndex, accessorIndex]}
                          draggable={!activeId}
                          dragType={dragType}
                          dropType={dropType}
                          data-test-subj={group.dataTestSubj}
                          value={{
                            columnId: accessor,
                            groupId: group.groupId,
                            layerId,
                            id: accessor,
                          }}
                          itemsInGroup={group.accessors.map((a) => ({
                            columnId: a.columnId,
                            groupId: group.groupId,
                            layerId,
                            id: a.columnId,
                          }))}
                          isValueEqual={isSameConfiguration}
                          label={columnLabelMap[accessor]}
                          droppable={dragging && isDroppable}
                          onDrop={(droppedItem, targetItem) => {
                            const dropTarget = targetItem
                              ? ((targetItem as unknown) as {
                                  groupId: string;
                                  columnId: string;
                                  layerId: string;
                                  isNew?: boolean;
                                })
                              : {
                                  layerId,
                                  groupId: group.groupId,
                                  columnId: accessor,
                                };

                            const filterOperations =
                              groups.find(({ groupId }) => groupId === dropTarget?.groupId)
                                ?.filterOperations || (() => false);

                            const dropResult = layerDatasource.onDrop({
                              ...layerDatasourceDropProps,
                              droppedItem,
                              ...dropTarget,
                              filterOperations,
                            });
                            if (dropResult) {
                              props.updateVisualization(
                                activeVisualization.setDimension({
                                  layerId: dropTarget.layerId,
                                  groupId: dropTarget.groupId,
                                  columnId: dropTarget.columnId,
                                  prevState: props.visualizationState,
                                })
                              );
                              if (typeof dropResult === 'object' && 'deleted' in dropResult) {
                                // When a column is moved, we delete the reference to the old
                                props.updateVisualization(
                                  activeVisualization.removeDimension({
                                    layerId,
                                    columnId: dropResult.deleted,
                                    prevState: props.visualizationState,
                                  })
                                );
                              }
                            }
                          }}
                        >
                          <div className="lnsLayerPanel__dimension">
                            <EuiLink
                              className="lnsLayerPanel__dimensionLink"
                              data-test-subj="lnsLayerPanel-dimensionLink"
                              onClick={() => {
                                setActiveDimension({
                                  isNew: false,
                                  activeGroup: group,
                                  activeId: accessor,
                                });
                              }}
                              aria-label={triggerLinkA11yText(columnLabelMap[accessor])}
                              title={triggerLinkA11yText(columnLabelMap[accessor])}
                            >
                              <ColorIndicator accessorConfig={accessorConfig}>
                                <NativeRenderer
                                  render={layerDatasource.renderDimensionTrigger}
                                  nativeProps={{
                                    ...layerDatasourceConfigProps,
                                    columnId: accessor,
                                    filterOperations: group.filterOperations,
                                  }}
                                />
                              </ColorIndicator>
                            </EuiLink>
                            <EuiButtonIcon
                              className="lnsLayerPanel__dimensionRemove"
                              data-test-subj="indexPattern-dimension-remove"
                              iconType="cross"
                              iconSize="s"
                              size="s"
                              color="danger"
                              aria-label={i18n.translate(
                                'xpack.lens.indexPattern.removeColumnLabel',
                                {
                                  defaultMessage: 'Remove configuration from "{groupLabel}"',
                                  values: { groupLabel: group.groupLabel },
                                }
                              )}
                              title={i18n.translate('xpack.lens.indexPattern.removeColumnLabel', {
                                defaultMessage: 'Remove configuration from "{groupLabel}"',
                                values: { groupLabel: group.groupLabel },
                              })}
                              onClick={() => {
                                trackUiEvent('indexpattern_dimension_removed');
                                props.updateAll(
                                  datasourceId,
                                  layerDatasource.removeColumn({
                                    layerId,
                                    columnId: accessor,
                                    prevState: layerDatasourceState,
                                  }),
                                  activeVisualization.removeDimension({
                                    layerId,
                                    columnId: accessor,
                                    prevState: props.visualizationState,
                                  })
                                );
                              }}
                            />
                            <PaletteIndicator accessorConfig={accessorConfig} />
                          </div>
                        </DragDrop>
                      );
                    })}
                  </ReorderProvider>
                  {group.supportsMoreColumns ? (
                    <EmptyDimensionButton
                      group={group}
                      groupIndex={groupIndex}
                      layerId={layerId}
                      layerIndex={layerIndex}
                      layerDatasource={layerDatasource}
                      layerDatasourceDropProps={layerDatasourceDropProps}
                      dragDropContext={dragDropContext}
                      onClick={(id) => {
                        setActiveDimension({
                          activeGroup: group,
                          activeId: id,
                          isNew: true,
                        });
                      }}
                      onDrop={(droppedItem, targetItem) => {
                        const {
                          columnId,
                          groupId,
                          layerId: targetLayerId,
                        } = (targetItem as unknown) as {
                          groupId: string;
                          columnId: string;
                          layerId: string;
                          isNew?: boolean;
                        };
                        const dropResult = layerDatasource.onDrop({
                          ...layerDatasourceDropProps,
                          droppedItem,
                          columnId,
                          groupId,
                          layerId: targetLayerId,
                          isNew: true,
                          filterOperations: group.filterOperations,
                        });
                        if (dropResult) {
                          props.updateVisualization(
                            activeVisualization.setDimension({
                              columnId,
                              groupId,
                              layerId: targetLayerId,
                              prevState: props.visualizationState,
                            })
                          );

                          if (typeof dropResult === 'object') {
                            // When a column is moved, we delete the reference to the old
                            props.updateVisualization(
                              activeVisualization.removeDimension({
                                columnId: dropResult.deleted,
                                layerId: targetLayerId,
                                prevState: props.visualizationState,
                              })
                            );
                          }
                        }
                      }}
                    />
                  ) : null}
                </>
              </EuiFormRow>
            );
          })}
          <DimensionContainer
            isOpen={!!activeId}
            groupLabel={activeGroup?.groupLabel || ''}
            handleClose={() => {
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
              setActiveDimension(initialActiveDimensionState);
            }}
            panel={
              <>
                {activeGroup && activeId && (
                  <NativeRenderer
                    render={layerDatasource.renderDimensionEditor}
                    nativeProps={{
                      ...layerDatasourceConfigProps,
                      core: props.core,
                      columnId: activeId,
                      filterOperations: activeGroup.filterOperations,
                      dimensionGroups: groups,
                      setState: (
                        newState: unknown,
                        {
                          shouldReplaceDimension,
                          shouldRemoveDimension,
                        }: {
                          shouldReplaceDimension?: boolean;
                          shouldRemoveDimension?: boolean;
                        } = {}
                      ) => {
                        if (shouldReplaceDimension || shouldRemoveDimension) {
                          props.updateAll(
                            datasourceId,
                            newState,
                            shouldRemoveDimension
                              ? activeVisualization.removeDimension({
                                  layerId,
                                  columnId: activeId,
                                  prevState: props.visualizationState,
                                })
                              : activeVisualization.setDimension({
                                  layerId,
                                  groupId: activeGroup.groupId,
                                  columnId: activeId,
                                  prevState: props.visualizationState,
                                })
                          );
                        } else {
                          props.updateDatasource(datasourceId, newState);
                        }
                        setActiveDimension({
                          ...activeDimension,
                          isNew: false,
                        });
                      },
                    }}
                  />
                )}
                {activeGroup &&
                  activeId &&
                  !activeDimension.isNew &&
                  activeVisualization.renderDimensionEditor &&
                  activeGroup?.enableDimensionEditor && (
                    <div className="lnsLayerPanel__styleEditor">
                      <NativeRenderer
                        render={activeVisualization.renderDimensionEditor}
                        nativeProps={{
                          ...layerVisualizationConfigProps,
                          groupId: activeGroup.groupId,
                          accessor: activeId,
                          setState: props.updateVisualization,
                        }}
                      />
                    </div>
                  )}
              </>
            }
          />

          <EuiSpacer size="m" />

          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}>
              <RemoveLayerButton
                onRemoveLayer={onRemoveLayer}
                layerIndex={layerIndex}
                isOnlyLayer={isOnlyLayer}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </section>
    </ChildDragDropProvider>
  );
}
