/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useState } from 'react';
import {
  EuiPanel,
  EuiSpacer,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiFormRow,
  EuiTabbedContent,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { NativeRenderer } from '../../../native_renderer';
import { StateSetter } from '../../../types';
import { DragContext, DragDrop, ChildDragDropProvider } from '../../../drag_drop';
import { LayerSettings } from './layer_settings';
import { trackUiEvent } from '../../../lens_ui_telemetry';
import { generateId } from '../../../id_generator';
import { ConfigPanelWrapperProps, DimensionPopoverState } from './types';
import { DimensionPopover } from './dimension_popover';

export function LayerPanel(
  props: Exclude<ConfigPanelWrapperProps, 'state' | 'setState'> & {
    layerId: string;
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
  const [popoverState, setPopoverState] = useState<DimensionPopoverState>({
    isOpen: false,
    openId: null,
    addingToGroupId: null,
    tabId: null,
  });

  const { framePublicAPI, layerId, isOnlyLayer, onRemoveLayer } = props;
  const datasourcePublicAPI = framePublicAPI.datasourceLayers[layerId];
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
  };

  const { groups } = activeVisualization.getConfiguration(layerVisualizationConfigProps);
  const isEmptyLayer = !groups.some((d) => d.accessors.length > 0);

  return (
    <ChildDragDropProvider {...dragDropContext}>
      <EuiPanel className="lnsLayerPanel" paddingSize="s">
        <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
          <EuiFlexItem grow={false}>
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
                  setState: (updater: unknown) => {
                    const newState =
                      typeof updater === 'function' ? updater(layerDatasourceState) : updater;
                    // Look for removed columns
                    const nextPublicAPI = layerDatasource.getPublicAPI({
                      state: newState,
                      layerId,
                      dateRange: props.framePublicAPI.dateRange,
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

        <EuiSpacer size="s" />

        {groups.map((group, index) => {
          const newId = generateId();
          const isMissing = !isEmptyLayer && group.required && group.accessors.length === 0;
          return (
            <EuiFormRow
              className="lnsLayerPanel__row"
              label={group.groupLabel}
              key={index}
              isInvalid={isMissing}
              error={
                isMissing
                  ? i18n.translate('xpack.lens.editorFrame.requiredDimensionWarningLabel', {
                      defaultMessage: 'Required dimension',
                    })
                  : []
              }
            >
              <>
                {group.accessors.map((accessor) => {
                  const tabs = [
                    {
                      id: 'datasource',
                      name: i18n.translate('xpack.lens.editorFrame.quickFunctionsLabel', {
                        defaultMessage: 'Quick functions',
                      }),
                      content: (
                        <NativeRenderer
                          render={props.datasourceMap[datasourceId].renderDimensionEditor}
                          nativeProps={{
                            ...layerDatasourceConfigProps,
                            core: props.core,
                            columnId: accessor,
                            filterOperations: group.filterOperations,
                          }}
                        />
                      ),
                    },
                  ];

                  if (activeVisualization.renderDimensionEditor && group.enableDimensionEditor) {
                    tabs.push({
                      id: 'visualization',
                      name: i18n.translate('xpack.lens.editorFrame.formatStyleLabel', {
                        defaultMessage: 'Format & style',
                      }),
                      content: (
                        <div className="lnsLayerPanel__styleEditor">
                          <NativeRenderer
                            render={activeVisualization.renderDimensionEditor}
                            nativeProps={{
                              ...layerVisualizationConfigProps,
                              groupId: group.groupId,
                              accessor,
                              setState: props.updateVisualization,
                            }}
                          />
                        </div>
                      ),
                    });
                  }

                  return (
                    <DragDrop
                      key={accessor}
                      className="lnsLayerPanel__dimension"
                      data-test-subj={group.dataTestSubj}
                      droppable={
                        dragDropContext.dragging &&
                        layerDatasource.canHandleDrop({
                          ...layerDatasourceDropProps,
                          columnId: accessor,
                          filterOperations: group.filterOperations,
                        })
                      }
                      onDrop={(droppedItem) => {
                        layerDatasource.onDrop({
                          ...layerDatasourceDropProps,
                          droppedItem,
                          columnId: accessor,
                          filterOperations: group.filterOperations,
                        });
                      }}
                    >
                      <DimensionPopover
                        popoverState={popoverState}
                        setPopoverState={setPopoverState}
                        groups={groups}
                        accessor={accessor}
                        groupId={group.groupId}
                        trigger={
                          <NativeRenderer
                            render={props.datasourceMap[datasourceId].renderDimensionTrigger}
                            nativeProps={{
                              ...layerDatasourceConfigProps,
                              columnId: accessor,
                              filterOperations: group.filterOperations,
                              suggestedPriority: group.suggestedPriority,
                              togglePopover: () => {
                                if (popoverState.isOpen) {
                                  setPopoverState({
                                    isOpen: false,
                                    openId: null,
                                    addingToGroupId: null,
                                    tabId: null,
                                  });
                                } else {
                                  setPopoverState({
                                    isOpen: true,
                                    openId: accessor,
                                    addingToGroupId: null, // not set for existing dimension
                                    tabId: 'datasource',
                                  });
                                }
                              },
                            }}
                          />
                        }
                        panel={
                          <EuiTabbedContent
                            tabs={tabs}
                            initialSelectedTab={tabs.find((t) => t.id === popoverState.tabId)}
                            size="s"
                            onTabClick={(tab) => {
                              setPopoverState({
                                ...popoverState,
                                tabId: tab.id as typeof popoverState['tabId'],
                              });
                            }}
                          />
                        }
                      />

                      <EuiButtonIcon
                        data-test-subj="indexPattern-dimensionPopover-remove"
                        iconType="cross"
                        iconSize="s"
                        size="s"
                        color="danger"
                        aria-label={i18n.translate('xpack.lens.indexPattern.removeColumnLabel', {
                          defaultMessage: 'Remove configuration',
                        })}
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
                    </DragDrop>
                  );
                })}
                {group.supportsMoreColumns ? (
                  <DragDrop
                    className="lnsLayerPanel__dimension"
                    data-test-subj={group.dataTestSubj}
                    droppable={
                      dragDropContext.dragging &&
                      layerDatasource.canHandleDrop({
                        ...layerDatasourceDropProps,
                        columnId: newId,
                        filterOperations: group.filterOperations,
                      })
                    }
                    onDrop={(droppedItem) => {
                      const dropSuccess = layerDatasource.onDrop({
                        ...layerDatasourceDropProps,
                        droppedItem,
                        columnId: newId,
                        filterOperations: group.filterOperations,
                      });
                      if (dropSuccess) {
                        props.updateVisualization(
                          activeVisualization.setDimension({
                            layerId,
                            groupId: group.groupId,
                            columnId: newId,
                            prevState: props.visualizationState,
                          })
                        );
                      }
                    }}
                  >
                    <DimensionPopover
                      popoverState={popoverState}
                      setPopoverState={setPopoverState}
                      groups={groups}
                      accessor={newId}
                      groupId={group.groupId}
                      trigger={
                        <div className="lnsLayerPanel__triggerLink">
                          <EuiButtonEmpty
                            iconType="plusInCircleFilled"
                            data-test-subj="lns-empty-dimension"
                            aria-label={i18n.translate('xpack.lens.configure.addConfig', {
                              defaultMessage: 'Add a configuration',
                            })}
                            title={i18n.translate('xpack.lens.configure.addConfig', {
                              defaultMessage: 'Add a configuration',
                            })}
                            onClick={() => {
                              if (popoverState.isOpen) {
                                setPopoverState({
                                  isOpen: false,
                                  openId: null,
                                  addingToGroupId: null,
                                  tabId: null,
                                });
                              } else {
                                setPopoverState({
                                  isOpen: true,
                                  openId: newId,
                                  addingToGroupId: group.groupId,
                                  tabId: 'datasource',
                                });
                              }
                            }}
                            size="xs"
                          >
                            <FormattedMessage
                              id="xpack.lens.configure.emptyConfig"
                              defaultMessage="Drop a field here"
                            />
                          </EuiButtonEmpty>
                        </div>
                      }
                      panel={
                        <NativeRenderer
                          render={props.datasourceMap[datasourceId].renderDimensionEditor}
                          nativeProps={{
                            ...layerDatasourceConfigProps,
                            core: props.core,
                            columnId: newId,
                            filterOperations: group.filterOperations,
                            suggestedPriority: group.suggestedPriority,

                            setState: (newState: unknown) => {
                              props.updateAll(
                                datasourceId,
                                newState,
                                activeVisualization.setDimension({
                                  layerId,
                                  groupId: group.groupId,
                                  columnId: newId,
                                  prevState: props.visualizationState,
                                })
                              );
                              setPopoverState({
                                isOpen: true,
                                openId: newId,
                                addingToGroupId: null, // clear now that dimension exists
                                tabId: popoverState.tabId ?? 'datasource',
                              });
                            },
                          }}
                        />
                      }
                    />
                  </DragDrop>
                ) : null}
              </>
            </EuiFormRow>
          );
        })}

        <EuiSpacer size="s" />

        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              iconType="trash"
              color="danger"
              data-test-subj="lns_layer_remove"
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
