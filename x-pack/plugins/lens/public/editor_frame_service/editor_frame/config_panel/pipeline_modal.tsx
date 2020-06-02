/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useState } from 'react';
import {
  EuiToolTip,
  EuiButton,
  EuiForm,
  EuiOverlayMask,
  EuiModal,
  EuiText,
  EuiPanel,
  EuiLink,
  EuiSpacer,
  EuiIcon,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSuperSelect,
  EuiSelect,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { Visualization, Datasource } from '../../../types';
import { NativeRenderer } from '../../../native_renderer';
import { trackUiEvent } from '../../../lens_ui_telemetry';
import { generateId } from '../../../id_generator';
import { removeLayer, appendLayer } from './layer_actions';
import { DragContext, DragDrop, ChildDragDropProvider } from '../../../drag_drop';
import { ConfigPanelWrapperProps } from './types';
import { DimensionPopover } from './dimension_popover';
import { PipelineState, TimeRangeOverride, JoinType } from '../state_management';

interface PopoverState {
  isOpen: boolean;
  layerId: string | null;
  columnId: string | null;
}

const timeRangeOptions: Array<{
  text: string;
  value: TimeRangeOverride;
}> = [
  {
    text: 'Default range',
    value: 'default',
  },
  {
    text: 'No time filter',
    value: 'none',
  },
  {
    text: 'All time before start of range',
    value: 'allBefore',
  },
  {
    text: 'Previous interval',
    value: 'previous',
  },
];

export function PipelineModal(
  props: ConfigPanelWrapperProps & {
    activeDatasourceId: string;
    activeVisualization: Visualization;
  }
) {
  const dragDropContext = useContext(DragContext);
  const [popoverState, setPopoverState] = useState<PopoverState>({
    isOpen: false,
    layerId: null,
    columnId: null,
  });

  const publicAPIs = Object.entries(props.framePublicAPI.datasourceLayers);

  const layers = publicAPIs.map(([id, publicAPI]) => ({
    layerId: id,
    datasourceId: publicAPI.datasourceId,
    columns: publicAPI.getTableSpec().map(({ columnId }) => columnId),
  }));

  const usedLayers = props.activeVisualization.getLayerIds(props.visualizationState);

  const layerPanels = (
    <EuiFlexGroup direction="row">
      {layers.map(({ layerId, datasourceId, columns }, index) => {
        const usedColumns = props.activeVisualization
          .getConfiguration({
            state: props.visualizationState,
            frame: props.framePublicAPI,
            layerId,
          })
          .groups.flatMap((g) => g.accessors);

        return (
          <EuiFlexItem key={layerId}>
            <EuiPanel>
              <EuiText>Layer {String.fromCharCode(index + 65)}</EuiText>

              {!usedLayers.includes(layerId) ? (
                <EuiText>
                  <EuiIcon type="eye" /> Not used in visualization
                </EuiText>
              ) : null}

              {layers.length > 1 ? (
                <EuiFormRow label="Time range">
                  <EuiSelect
                    options={timeRangeOptions}
                    value={props.frameState.pipeline.timeRangeOverrides[layerId] ?? 'default'}
                    onChange={(e) => {
                      props.dispatch({
                        type: 'SET_PIPELINE',
                        newState: {
                          ...props.frameState.pipeline,
                          timeRangeOverrides: {
                            ...props.frameState.pipeline.timeRangeOverrides,
                            [layerId]: e.target.value as TimeRangeOverride,
                          },
                        },
                      });
                    }}
                  />
                </EuiFormRow>
              ) : null}

              {columns.map((c) => (
                <div className="lnsLayerPanel__dimension" key={c}>
                  <div className="lnsDimensionPopover__trigger">
                    <NativeRenderer
                      render={props.datasourceMap[datasourceId].renderDimensionTrigger}
                      nativeProps={{
                        layerId,
                        columnId: c,
                        state: props.datasourceStates[datasourceId].state,
                        filterOperations: (o) => true,
                        togglePopover: () => {
                          if (popoverState.isOpen) {
                            setPopoverState({
                              isOpen: false,
                              layerId: null,
                              columnId: null,
                            });
                          } else {
                            setPopoverState({
                              isOpen: true,
                              layerId,
                              columnId: c,
                            });
                          }
                        },
                        dragDropContext,
                      }}
                    />
                  </div>

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

                      props.dispatch({
                        type: 'UPDATE_STATE',
                        subType: 'UPDATE_ALL_STATES',
                        updater: (prevState) => {
                          return {
                            ...prevState,
                            datasourceStates: {
                              ...prevState.datasourceStates,
                              [datasourceId]: {
                                state: props.datasourceMap[datasourceId].removeColumn({
                                  layerId,
                                  columnId: c,
                                  prevState: props.datasourceStates[datasourceId].state,
                                }),
                                isLoading: false,
                              },
                            },
                            visualization: {
                              ...prevState.visualization,
                              state: props.activeVisualization.removeDimension({
                                layerId,
                                columnId: c,
                                prevState: props.visualizationState,
                              }),
                            },
                            stagedPreview: undefined,
                          };
                        },
                      });
                    }}
                  />

                  {!usedColumns.includes(c) ? (
                    <EuiText>
                      <EuiIcon type="eye" /> Not used in visualization
                    </EuiText>
                  ) : null}
                </div>
              ))}

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
                        columnId: null,
                        layerId: null,
                      });
                    } else {
                      setPopoverState({
                        isOpen: true,
                        layerId,
                        columnId: generateId(),
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
            </EuiPanel>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );

  return (
    <div className="lnsDataPanel__modal">
      <EuiText size="s">Queries</EuiText>

      {layerPanels}

      {layers.length < 2 ? (
        <EuiFlexItem>
          <EuiToolTip
            className="eui-fullWidth"
            content={i18n.translate('xpack.lens.xyChart.addLayerTooltip', {
              defaultMessage:
                'Use multiple layers to combine chart types or visualize different index patterns.',
            })}
            position="bottom"
          >
            <EuiButton
              className="lnsConfigPanel__addLayerBtn"
              fullWidth
              size="s"
              data-test-subj="lnsXY_layer_add"
              onClick={() => {
                props.dispatch({
                  type: 'UPDATE_STATE',
                  subType: 'ADD_LAYER',
                  updater: (state) => ({
                    ...state,
                    datasourceStates: {
                      ...state.datasourceStates,
                      [props.activeDatasourceId]: {
                        ...state.datasourceStates[props.activeDatasourceId],
                        state: props.datasourceMap[props.activeDatasourceId].insertLayer(
                          state.datasourceStates[props.activeDatasourceId].state,
                          generateId()
                        ),
                      },
                    },
                    stagedPreview: undefined,
                  }),
                });
              }}
              iconType="plusInCircleFilled"
            >
              <FormattedMessage id="xpack.lens.xyChart.addLayerButton" defaultMessage="Add layer" />
            </EuiButton>
          </EuiToolTip>
        </EuiFlexItem>
      ) : null}

      <EuiSpacer size="s" />

      {layers.length > 1 ? (
        <>
          <EuiText size="s">Join nodes</EuiText>
          <EuiSpacer size="s" />
          {props.frameState.pipeline.join ? (
            <>
              <EuiFormRow
                label={i18n.translate('xpack.pipeline_builder.joinNode.joinTypeLabel', {
                  defaultMessage: 'Join type',
                })}
              >
                <EuiSelect
                  value={props.frameState.pipeline.join.joinType}
                  options={[
                    { value: 'full', text: 'Full join' },
                    { value: 'left_outer', text: 'Left outer join' },
                    { value: 'right_outer', text: 'Right outer join' },
                    { value: 'inner', text: 'Inner join' },
                    { value: 'cross', text: 'Cross join' },
                  ]}
                  onChange={(e) => {
                    props.dispatch({
                      type: 'SET_PIPELINE',
                      newState: {
                        ...props.frameState.pipeline,
                        join: {
                          ...props.frameState.pipeline.join,
                          joinType: e.target.value as JoinType,
                        },
                      },
                    });
                  }}
                />
              </EuiFormRow>
              {props.frameState.pipeline.join.joinType !== 'full' ? (
                <EuiFlexGroup direction="row">
                  <EuiFlexItem>
                    <EuiFormRow
                      label={i18n.translate('xpack.pipeline_builder.joinNode.joinColumnLabel', {
                        defaultMessage: 'Column from A',
                      })}
                    >
                      <ColumnSelect
                        value={props.frameState.pipeline.join?.leftColumnId}
                        columnIds={layers[0].columns}
                        datasource={props.datasourceMap.indexpattern}
                        layerId={layers[0].layerId}
                        datasourceState={props.datasourceStates.indexpattern.state}
                        onChange={(id) => {
                          props.dispatch({
                            type: 'SET_PIPELINE',
                            newState: {
                              ...props.frameState.pipeline,
                              join: {
                                ...props.frameState.pipeline.join,
                                leftColumnId: id,
                              },
                            },
                          });
                        }}
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFormRow
                      label={i18n.translate('xpack.pipeline_builder.joinNode.joinColumnLabel', {
                        defaultMessage: 'Column from B',
                      })}
                    >
                      <ColumnSelect
                        value={props.frameState.pipeline.join?.rightColumnId}
                        columnIds={layers[0].columns}
                        datasource={props.datasourceMap.indexpattern}
                        layerId={layers[0].layerId}
                        datasourceState={props.datasourceStates.indexpattern.state}
                        onChange={(id) => {
                          props.dispatch({
                            type: 'SET_PIPELINE',
                            newState: {
                              ...props.frameState.pipeline,
                              join: {
                                ...props.frameState.pipeline.join,
                                rightColumnId: id,
                              },
                            },
                          });
                        }}
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                </EuiFlexGroup>
              ) : null}
            </>
          ) : (
            <EuiButton
              onClick={() => {
                props.dispatch({
                  type: 'SET_PIPELINE',
                  newState: {
                    ...props.frameState.pipeline,
                    join: {
                      joinType: 'full',
                      leftLayerId: layers[0].layerId,
                      rightLayerId: layers[1].layerId,
                    },
                  },
                });
              }}
            >
              Join A and B
            </EuiButton>
          )}
        </>
      ) : null}

      <EuiText size="s">Manipulation</EuiText>

      {popoverState.isOpen ? (
        <EuiOverlayMask>
          <EuiModal
            onClose={() => {
              setPopoverState({
                isOpen: false,
                layerId: null,
                columnId: null,
              });
            }}
          >
            <EuiPanel className="lnsDataPanel__dimensionModal">
              <NativeRenderer
                render={props.datasourceMap.indexpattern.renderDimensionEditor}
                nativeProps={{
                  core: props.core,
                  dateRange: props.framePublicAPI.dateRange,
                  columnId: popoverState.columnId as string,
                  layerId: popoverState.layerId as string,
                  state: props.datasourceStates.indexpattern.state,
                  // filterOperations: group.filterOperations,
                  // suggestedPriority: group.suggestedPriority,
                  filterOperations: (o) => true,

                  setState: (newState: unknown) => {
                    props.dispatch({
                      type: 'UPDATE_STATE',
                      subType: 'UPDATE_ALL_STATES',
                      updater: (prevState) => {
                        return {
                          ...prevState,
                          datasourceStates: {
                            ...prevState.datasourceStates,
                            indexpattern: { state: newState, isLoading: false },
                          },
                          stagedPreview: undefined,
                        };
                      },
                    });

                    // setPopoverState({
                    //   isOpen: false,
                    //   layerId: null,
                    //   columnId: null,
                    // });
                  },
                }}
              />
            </EuiPanel>
          </EuiModal>
        </EuiOverlayMask>
      ) : null}
    </div>
  );
}

function ColumnSelect(props: {
  value?: string;
  columnIds: string[];
  onChange: (id: string) => void;
  datasource: Datasource;
  datasourceState: unknown;
  layerId: string;
}) {
  const dragDropContext = useContext(DragContext);
  return (
    <EuiSuperSelect
      valueOfSelected={props.value}
      options={props.columnIds.map((c) => ({
        value: c,
        inputDisplay: (
          <NativeRenderer
            render={props.datasource.renderDimensionTrigger}
            nativeProps={{
              layerId: props.layerId,
              columnId: c,
              state: props.datasourceState,
              filterOperations: (o) => true,
              togglePopover: () => {},
              dragDropContext,
            }}
          />
        ),
      }))}
      onChange={props.onChange}
    />
  );
}
