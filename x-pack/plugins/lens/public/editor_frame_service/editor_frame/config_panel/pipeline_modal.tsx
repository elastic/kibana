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
  EuiFieldText,
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
    operations: publicAPI
      .getTableSpec()
      .map(({ columnId }) => publicAPI.getOperationForColumnId(columnId)!),
  }));

  const usedLayers = props.activeVisualization.getLayerIds(props.visualizationState);

  const layerPanels = (
    <EuiFlexGroup direction="row">
      {layers.map(({ layerId, datasourceId, columns, operations }, index) => {
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
                <EuiText size="s">
                  <EuiIcon type="eyeClosed" /> Not used in visualization
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

              {columns.map((c, i) => (
                <div className="lnsLayerPanel__dimension" key={c}>
                  <EuiLink
                    className="lnsDimensionPopover__trigger"
                    onClick={() => {
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
                    }}
                  >
                    {operations[i].label}
                  </EuiLink>

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
                    <EuiText size="s">
                      <EuiIcon type="eyeClosed" /> Not used in visualization
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

  const { prejoin, join, postjoin } = props.frameState.pipeline;

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
          {join ? (
            <>
              <EuiFormRow
                label={i18n.translate('xpack.pipeline_builder.joinNode.joinTypeLabel', {
                  defaultMessage: 'Join type',
                })}
              >
                <EuiSelect
                  value={join.joinType}
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
                          ...join,
                          joinType: e.target.value as JoinType,
                        },
                      },
                    });
                  }}
                />
              </EuiFormRow>
              {join.joinType !== 'full' ? (
                <EuiFlexGroup direction="row">
                  <EuiFlexItem>
                    <EuiFormRow
                      label={i18n.translate('xpack.pipeline_builder.joinNode.joinColumnLabel', {
                        defaultMessage: 'Column from A',
                      })}
                    >
                      <EuiSelect
                        value={join?.leftColumnId}
                        options={[{ text: '' }].concat(
                          layers[0].columns.map((id, pos) => ({
                            text: layers[0].operations[pos].label,
                            value: id,
                          }))
                        )}
                        onChange={(e) => {
                          props.dispatch({
                            type: 'SET_PIPELINE',
                            newState: {
                              ...props.frameState.pipeline,
                              join: {
                                ...join,
                                leftColumnId: e.target.value,
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
                      <EuiSelect
                        value={join?.rightColumnId}
                        options={[{ text: '' }].concat(
                          layers[1].columns.map((id, pos) => ({
                            text: layers[1].operations[pos].label,
                            value: id,
                          }))
                        )}
                        onChange={(e) => {
                          props.dispatch({
                            type: 'SET_PIPELINE',
                            newState: {
                              ...props.frameState.pipeline,
                              join: {
                                ...join,
                                rightColumnId: e.target.value,
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
                  type: 'UPDATE_STATE',
                  subType: 'ADD_JOIN',
                  updater: (state) => ({
                    ...state,
                    pipeline: {
                      ...state.pipeline,
                      join: {
                        joinType: 'full',
                        leftLayerId: layers[0].layerId,
                        rightLayerId: layers[1].layerId,
                      },
                    },
                    // Remove the right layer from the visualization...
                    // this is basically a hack
                    visualization: {
                      ...state.visualization,
                      state: props.activeVisualization.removeLayer(
                        state.visualization.state,
                        layers[1].layerId
                      ),
                    },
                  }),
                });
              }}
            >
              Join A and B
            </EuiButton>
          )}
        </>
      ) : null}

      {join ? (
        <>
          <EuiText size="s">Table transformation</EuiText>

          {postjoin.length ? (
            <>
              {postjoin.map((j, i) => {
                // const mappings = j.expression.arguments.
                return (
                  <>
                    <EuiPanel>
                      <EuiText>Calculated math column</EuiText>

                      {(j.inputColumns ?? []).map(({ from, to }, index) => {
                        return (
                          <>
                            <EuiFlexGroup direction="row">
                              <EuiFlexItem>
                                <EuiFormRow label="Input column">
                                  <EuiSelect
                                    value={from}
                                    options={layers[0].columns
                                      // .filter(
                                      //   (id, pos) => layers[0].operations[pos].dataType === 'number'
                                      // )
                                      .map((id, pos) => ({
                                        text: layers[0].operations[pos].label,
                                        value: id,
                                      }))
                                      .concat(
                                        layers[1].columns
                                          // .filter(
                                          //   (id, pos) =>
                                          //     layers[1].operations[pos].dataType === 'number'
                                          // )
                                          .map((id, pos) => ({
                                            text: layers[1].operations[pos].label,
                                            value: id,
                                          }))
                                      )}
                                    onChange={(e) => {
                                      const newInputColumns = j.inputColumns?.map((c, i2) =>
                                        i2 === index ? { from: e.target.value, to } : c
                                      );
                                      const mapping: Record<string, string> = {};
                                      newInputColumns?.forEach((c) => (mapping[c.to] = c.from));
                                      const newOp = {
                                        ...j,
                                        inputColumns: newInputColumns,
                                        expression: {
                                          ...j.expression,
                                          arguments: {
                                            ...j.expression.arguments,
                                            inputMapping: [JSON.stringify(mapping)],
                                          },
                                        },
                                      };
                                      props.dispatch({
                                        type: 'SET_PIPELINE',
                                        newState: {
                                          ...props.frameState.pipeline,
                                          postjoin: postjoin.map((p, pos) =>
                                            pos === i ? newOp : p
                                          ),
                                        },
                                      });
                                    }}
                                  />
                                </EuiFormRow>
                              </EuiFlexItem>

                              <EuiFlexItem>
                                <EuiFormRow label="New name">
                                  <EuiFieldText
                                    value={to}
                                    onChange={(e) => {
                                      const newInputColumns = j.inputColumns?.map((c, i2) =>
                                        i2 === index ? { to: e.target.value, from } : c
                                      );
                                      const mapping: Record<string, string> = {};
                                      newInputColumns?.forEach((c) => (mapping[c.to] = c.from));
                                      const newOp = {
                                        ...j,
                                        inputColumns: newInputColumns,
                                        expression: {
                                          ...j.expression,
                                          arguments: {
                                            ...j.expression.arguments,
                                            inputMapping: [JSON.stringify(mapping)],
                                          },
                                        },
                                      };
                                      props.dispatch({
                                        type: 'SET_PIPELINE',
                                        newState: {
                                          ...props.frameState.pipeline,
                                          postjoin: postjoin.map((p, pos) =>
                                            pos === i ? newOp : p
                                          ),
                                        },
                                      });
                                    }}
                                  />
                                </EuiFormRow>
                              </EuiFlexItem>
                            </EuiFlexGroup>
                          </>
                        );
                      })}

                      <EuiButton
                        onClick={() => {
                          const newOp = { ...j, inputColumns: [...(j.inputColumns ?? []), {}] };
                          props.dispatch({
                            type: 'SET_PIPELINE',
                            newState: {
                              ...props.frameState.pipeline,
                              postjoin: postjoin.map((p, pos) => (pos === i ? newOp : p)),
                            },
                          });
                        }}
                      >
                        <EuiIcon type="plusInCircle" />
                        Add input parameter
                      </EuiButton>

                      <EuiFormRow label="TinyMath expression">
                        <EuiFieldText
                          value={j.expression.arguments.expression[0]?.arguments?.expression[0]}
                          onChange={(e) => {
                            const newOp = {
                              ...j,
                              expression: {
                                ...j.expression,
                                arguments: {
                                  ...j.expression.arguments,
                                  expression: [
                                    {
                                      ...j.expression.arguments.expression[0],
                                      chain: [
                                        {
                                          ...j.expression.arguments.expression[0].chain[0],
                                          arguments: {
                                            ...j.expression.arguments.expression[0].chain[0]
                                              .arguments,
                                            expression: [e.target.value],
                                          },
                                        },
                                      ],
                                    },
                                  ],
                                },
                              },
                            };
                            props.dispatch({
                              type: 'SET_PIPELINE',
                              newState: {
                                ...props.frameState.pipeline,
                                postjoin: postjoin.map((p, pos) => (pos === i ? newOp : p)),
                              },
                            });
                          }}
                        />
                      </EuiFormRow>

                      {/*
                      <EuiFormRow label="Operation">
                        <EuiSelect
                          options={[
                            {
                              text: 'Add',
                              value: 'add',
                            },
                            {
                              text: 'Subtract',
                              value: 'subtract',
                            },
                            {
                              text: 'Divide',
                              value: 'divide',
                            },
                            {
                              text: 'Multiply',
                              value: 'multiply',
                            },
                          ]}
                          value={
                            j.expression.arguments.operation
                              ? j.expression.arguments.operation[0]
                              : ''
                          }
                          onChange={(e) => {
                            props.dispatch({
                              type: 'SET_PIPELINE',
                              newState: {
                                ...props.frameState.pipeline,
                                postjoin: postjoin.map((p, pos) =>
                                  pos === i
                                    ? {
                                        ...j,
                                        expression: {
                                          ...j.expression,
                                          arguments: {
                                            ...j.expression.arguments,
                                            operation: [e.target.value],
                                          },
                                        },
                                      }
                                    : p
                                ),
                              },
                            });
                          }}
                        />
                      </EuiFormRow>

                      <EuiFormRow label="Left side">
                        <EuiSelect
                          value={
                            j.expression.arguments?.left
                              ? j.expression.arguments.left[0]
                              : undefined
                          }
                          options={layers[0].columns
                            .filter((id, pos) => layers[0].operations[pos].dataType === 'number')
                            .map((id, pos) => ({
                              text: layers[0].operations[pos].label,
                              value: id,
                            }))
                            .concat(
                              layers[1].columns
                                .filter(
                                  (id, pos) => layers[1].operations[pos].dataType === 'number'
                                )
                                .map((id, pos) => ({
                                  text: layers[1].operations[pos].label,
                                  value: id,
                                }))
                            )}
                          onChange={(e) => {
                            props.dispatch({
                              type: 'SET_PIPELINE',
                              newState: {
                                ...props.frameState.pipeline,
                                postjoin: postjoin.map((p, pos) =>
                                  pos === i
                                    ? {
                                        ...j,
                                        expression: {
                                          ...j.expression,
                                          arguments: {
                                            ...j.expression.arguments,
                                            left: [e.target.value],
                                          },
                                        },
                                      }
                                    : p
                                ),
                              },
                            });
                          }}
                        />
                      </EuiFormRow>

                      <EuiFormRow label="Right side">
                        <EuiSelect
                          value={
                            j.expression.arguments?.right
                              ? j.expression.arguments.right[0]
                              : undefined
                          }
                          options={layers[0].columns
                            .filter((id, pos) => layers[0].operations[pos].dataType === 'number')
                            .map((id, pos) => ({
                              text: layers[0].operations[pos].label,
                              value: id,
                            }))
                            .concat(
                              layers[1].columns
                                .filter(
                                  (id, pos) => layers[1].operations[pos].dataType === 'number'
                                )
                                .map((id, pos) => ({
                                  text: layers[1].operations[pos].label,
                                  value: id,
                                }))
                            )}
                          onChange={(e) => {
                            props.dispatch({
                              type: 'SET_PIPELINE',
                              newState: {
                                ...props.frameState.pipeline,
                                postjoin: postjoin.map((p, pos) =>
                                  pos === i
                                    ? {
                                        ...j,
                                        expression: {
                                          ...j.expression,
                                          arguments: {
                                            ...j.expression.arguments,
                                            right: [e.target.value],
                                          },
                                        },
                                      }
                                    : p
                                ),
                              },
                            });
                          }}
                        />
                        </EuiFormRow>*/}
                    </EuiPanel>
                  </>
                );
              })}
            </>
          ) : null}

          <EuiButton
            onClick={() => {
              props.dispatch({
                type: 'SET_PIPELINE',
                newState: {
                  ...props.frameState.pipeline,
                  postjoin: [
                    ...postjoin,
                    {
                      type: 'math',
                      label: 'Math',
                      addedColumnId: 'math',
                      layerId: layers[0].layerId,
                      inputColumns: [],
                      expression: {
                        type: 'function',
                        function: 'lens_multi_map',
                        arguments: {
                          layerId: [layers[0].layerId],
                          inputMapping: ['{}'],
                          outputId: ['math'],
                          expression: [
                            {
                              type: 'expression',
                              chain: [
                                {
                                  type: 'function',
                                  function: 'math',
                                  arguments: { expression: [''] },
                                },
                              ],
                            },
                          ],
                        },
                      },
                    },
                  ],
                },
              });
            }}
          >
            Add new transformation
          </EuiButton>
        </>
      ) : null}

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
