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
  EuiButtonEmpty,
  EuiFormRow,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { NativeRenderer } from '../../../native_renderer';
import { StateSetter, isDraggedOperation } from '../../../types';
import { DragContext, DragDrop, ChildDragDropProvider, ReorderProvider } from '../../../drag_drop';
import { LayerSettings } from './layer_settings';
import { trackUiEvent } from '../../../lens_ui_telemetry';
import { generateId } from '../../../id_generator';
import { ConfigPanelWrapperProps, ActiveDimensionState } from './types';
import { DimensionContainer } from './dimension_container';
import { ColorIndicator } from './color_indicator';
import { PaletteIndicator } from './palette_indicator';

const initialActiveDimensionState = {
  isNew: false,
};

function isConfiguration(
  value: unknown
): value is { columnId: string; groupId: string; layerId: string } {
  return (
    value &&
    typeof value === 'object' &&
    'columnId' in value &&
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
    dataTestSubj: string;
    isOnlyLayer: boolean;
    updateVisualization: StateSetter<unknown>;
    updateDatasource: (datasourceId: string, newState: unknown) => void;
    updateAll: (
      datasourceId: string,
      newDatasourcestate: unknown,
      newVisualizationState: unknown
    ) => void;
    onRemoveLayer: () => void;
  }
) {
  const dragDropContext = useContext(DragContext);
  const [activeDimension, setActiveDimension] = useState<ActiveDimensionState>(
    initialActiveDimensionState
  );

  const { framePublicAPI, layerId, isOnlyLayer, onRemoveLayer, dataTestSubj } = props;
  const datasourcePublicAPI = framePublicAPI.datasourceLayers[layerId];

  useEffect(() => {
    setActiveDimension(initialActiveDimensionState);
  }, [props.activeVisualizationId]);

  if (
    !datasourcePublicAPI ||
    !props.activeVisualizationId ||
    !props.visualizationMap[props.activeVisualizationId]
  ) {
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
      <EuiPanel data-test-subj={dataTestSubj} className="lnsLayerPanel" paddingSize="s">
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

        {groups.map((group, index) => {
          const newId = generateId();
          const isMissing = !isEmptyLayer && group.required && group.accessors.length === 0;

          const triggerLinkA11yText = i18n.translate('xpack.lens.configure.editConfig', {
            defaultMessage: 'Click to edit configuration or drag to move',
          });

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
              key={index}
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
                  {group.accessors.map((accessorConfig) => {
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

                    const isFromCompatibleGroup =
                      dragging?.groupId !== group.groupId &&
                      layerDatasource.canHandleDrop({
                        ...layerDatasourceDropProps,
                        columnId: accessor,
                        filterOperations: group.filterOperations,
                      });

                    const isFromTheSameGroup =
                      isDraggedOperation(dragging) &&
                      dragging.groupId === group.groupId &&
                      dragging.columnId !== accessor &&
                      dragging.groupId !== 'y'; // TODO: remove this line when https://github.com/elastic/elastic-charts/issues/868 is fixed

                    const isDroppable = isDraggedOperation(dragging)
                      ? dragType === 'reorder'
                        ? isFromTheSameGroup
                        : isFromCompatibleGroup
                      : layerDatasource.canHandleDrop({
                          ...layerDatasourceDropProps,
                          columnId: accessor,
                          filterOperations: group.filterOperations,
                        });

                    return (
                      <DragDrop
                        key={accessor}
                        draggable={!activeId}
                        dragType={dragType}
                        dropType={dropType}
                        data-test-subj={group.dataTestSubj}
                        itemsInGroup={group.accessors.map((a) =>
                          typeof a === 'string' ? a : a.columnId
                        )}
                        className={'lnsLayerPanel__dimensionContainer'}
                        value={{
                          columnId: accessor,
                          groupId: group.groupId,
                          layerId,
                          id: accessor,
                        }}
                        isValueEqual={isSameConfiguration}
                        label={columnLabelMap[accessor]}
                        droppable={dragging && isDroppable}
                        dropTo={(dropTargetId: string) => {
                          layerDatasource.onDrop({
                            isReorder: true,
                            ...layerDatasourceDropProps,
                            droppedItem: {
                              columnId: accessor,
                              groupId: group.groupId,
                              layerId,
                              id: accessor,
                            },
                            columnId: dropTargetId,
                            filterOperations: group.filterOperations,
                          });
                        }}
                        onDrop={(droppedItem) => {
                          const isReorder =
                            isDraggedOperation(droppedItem) &&
                            droppedItem.groupId === group.groupId &&
                            droppedItem.columnId !== accessor;

                          const dropResult = layerDatasource.onDrop({
                            isReorder,
                            ...layerDatasourceDropProps,
                            droppedItem,
                            columnId: accessor,
                            filterOperations: group.filterOperations,
                          });
                          if (typeof dropResult === 'object') {
                            // When a column is moved, we delete the reference to the old
                            props.updateVisualization(
                              activeVisualization.removeDimension({
                                layerId,
                                columnId: dropResult.deleted,
                                prevState: props.visualizationState,
                              })
                            );
                          }
                        }}
                      >
                        <div className="lnsLayerPanel__dimension">
                          <EuiLink
                            className="lnsLayerPanel__dimensionLink"
                            onClick={() => {
                              if (activeId) {
                                setActiveDimension(initialActiveDimensionState);
                              } else {
                                setActiveDimension({
                                  isNew: false,
                                  activeGroup: group,
                                  activeId: accessor,
                                });
                              }
                            }}
                            aria-label={triggerLinkA11yText}
                            title={triggerLinkA11yText}
                          >
                            <ColorIndicator accessorConfig={accessorConfig}>
                              <NativeRenderer
                                render={props.datasourceMap[datasourceId].renderDimensionTrigger}
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
                                defaultMessage: 'Remove configuration',
                              }
                            )}
                            title={i18n.translate('xpack.lens.indexPattern.removeColumnLabel', {
                              defaultMessage: 'Remove configuration',
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
                  <div className={'lnsLayerPanel__dimensionContainer'}>
                    <DragDrop
                      data-test-subj={group.dataTestSubj}
                      droppable={
                        Boolean(dragDropContext.dragging) &&
                        // Verify that the dragged item is not coming from the same group
                        // since this would be a reorder
                        (!isDraggedOperation(dragDropContext.dragging) ||
                          dragDropContext.dragging.groupId !== group.groupId) &&
                        layerDatasource.canHandleDrop({
                          ...layerDatasourceDropProps,
                          columnId: newId,
                          filterOperations: group.filterOperations,
                        })
                      }
                      onDrop={(droppedItem) => {
                        const dropResult = layerDatasource.onDrop({
                          ...layerDatasourceDropProps,
                          droppedItem,
                          columnId: newId,
                          filterOperations: group.filterOperations,
                        });
                        if (dropResult) {
                          props.updateVisualization(
                            activeVisualization.setDimension({
                              layerId,
                              groupId: group.groupId,
                              columnId: newId,
                              prevState: props.visualizationState,
                            })
                          );

                          if (typeof dropResult === 'object') {
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
                      <div className="lnsLayerPanel__dimension lnsLayerPanel__dimension--empty">
                        <EuiButtonEmpty
                          className="lnsLayerPanel__triggerText"
                          color="text"
                          size="xs"
                          iconType="plusInCircleFilled"
                          contentProps={{
                            className: 'lnsLayerPanel__triggerTextContent',
                          }}
                          data-test-subj="lns-empty-dimension"
                          onClick={() => {
                            if (activeId) {
                              setActiveDimension(initialActiveDimensionState);
                            } else {
                              setActiveDimension({
                                isNew: true,
                                activeGroup: group,
                                activeId: newId,
                              });
                            }
                          }}
                        >
                          <FormattedMessage
                            id="xpack.lens.configure.emptyConfig"
                            defaultMessage="Drop a field or click to add"
                          />
                        </EuiButtonEmpty>
                      </div>
                    </DragDrop>
                  </div>
                ) : null}
              </>
            </EuiFormRow>
          );
        })}
        <DimensionContainer
          isOpen={!!activeId}
          groupLabel={activeGroup?.groupLabel || ''}
          handleClose={() => setActiveDimension(initialActiveDimensionState)}
          panel={
            <>
              {activeGroup && activeId && (
                <NativeRenderer
                  render={props.datasourceMap[datasourceId].renderDimensionEditor}
                  nativeProps={{
                    ...layerDatasourceConfigProps,
                    core: props.core,
                    columnId: activeId,
                    filterOperations: activeGroup.filterOperations,
                    dimensionGroups: groups,
                    setState: (newState: unknown) => {
                      props.updateAll(
                        datasourceId,
                        newState,
                        activeVisualization.setDimension({
                          layerId,
                          groupId: activeGroup.groupId,
                          columnId: activeId,
                          prevState: props.visualizationState,
                        })
                      );
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
            <EuiButtonEmpty
              size="xs"
              iconType="trash"
              color="danger"
              data-test-subj="lnsLayerRemove"
              onClick={() => {
                // If we don't blur the remove / clear button, it remains focused
                // which is a strange UX in this case. e.target.blur doesn't work
                // due to who knows what, but probably event re-writing. Additionally,
                // activeElement does not have blur so, we need to do some casting + safeguards.
                const el = (document.activeElement as unknown) as { blur: () => void };

                if (el?.blur) {
                  el.blur();
                }

                onRemoveLayer();
              }}
            >
              {isOnlyLayer
                ? i18n.translate('xpack.lens.resetLayer', {
                    defaultMessage: 'Reset layer',
                  })
                : i18n.translate('xpack.lens.deleteLayer', {
                    defaultMessage: 'Delete layer',
                  })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </ChildDragDropProvider>
  );
}
