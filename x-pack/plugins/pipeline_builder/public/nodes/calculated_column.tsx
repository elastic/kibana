/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFormRow,
  EuiFieldText,
  EuiProgress,
  EuiSelect,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import {
  NodeDefinition,
  RenderNode,
  Node,
  DataType,
  PipelineColumn,
  PipelineTable,
  DispatchFn,
} from '../types';
import { useLoader } from '../state';

interface CalculatedColumnState {
  outputColumnId?: string;
  selectedFormula?: string;
  formulaState?: unknown;
}

function CalculatedColumn({ node, dispatch }: RenderNode<CalculatedColumnState>) {
  const loader = useLoader();
  const { state, inputNodeIds } = node;
  const inputTables = inputNodeIds.map(id => loader.lastData[id]?.value);

  return (
    <div>
      <EuiFormRow
        label={i18n.translate('xpack.pipeline_builder.calculatedColumn.outputColumnId', {
          defaultMessage: 'Output column id',
        })}
      >
        <EuiFieldText
          value={state.outputColumnId}
          onChange={e => {
            dispatch({
              type: 'SET_NODE',
              nodeId: node.id,
              newState: { ...node.state, outputColumnId: e.target.value },
            });
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('xpack.pipeline_builder.calculatedColumn.formula', {
          defaultMessage: 'Calculation',
        })}
      >
        <EuiSelect
          options={[{ text: 'No formula', value: '' }].concat(
            Object.entries(calculations).map(([id, c]) => ({ text: c.title, value: id }))
          )}
          value={node.state.selectedFormula ?? ''}
          onChange={e => {
            dispatch({
              type: 'SET_NODE',
              nodeId: node.id,
              newState: {
                ...node.state,
                selectedFormula: e.target.value,
                formulaState: {},
              },
            });
          }}
        />
      </EuiFormRow>

      {node.state.selectedFormula && inputTables.length
        ? calculations[node.state.selectedFormula].renderEditor(node, inputTables[0], dispatch)
        : null}
    </div>
  );
}

export const definition: NodeDefinition<CalculatedColumnState> = {
  title: i18n.translate('xpack.pipeline_builder.calculatedColumnTitle', {
    defaultMessage: 'Quick calculations',
  }),
  inputNodeTypes: ['table'],
  outputType: 'table',

  icon: 'aggregate',

  initialize(): CalculatedColumnState {
    return {};
  },

  renderReact: CalculatedColumn,

  async run(node, inputs, inputNodeIds, deps) {
    const value = inputs[inputNodeIds[0]]?.value;

    const { outputColumnId, selectedFormula, formulaState } = node.state;
    if (!outputColumnId || !selectedFormula || !formulaState) {
      return value;
    }

    return calculations[selectedFormula].run(node, value);
  },
};

const calculations: Record<
  string,
  {
    title: string;
    run: (node: Node<CalculatedColumnState>, table: PipelineTable) => PipelineTable;
    renderEditor: (
      state: Node<CalculatedColumnState>,
      table: PipelineTable,
      dispatch: DispatchFn
    ) => React.ReactElement;
  }
> = {
  percentage_of: {
    title: 'Percentage of',
    run: (node, table) => {
      const { state, id } = node;
      if (!state.outputColumnId || !state.formulaState.column) {
        return table;
      }

      if (!state.formulaState.percentageType) {
        // Default type: Percent of total
        const columnTotal = table.rows.reduce((prev, current) => {
          return prev + current[state.formulaState.column];
        }, 0);
        return {
          columns: table.columns.concat([{ id: state.outputColumnId, dataType: 'number' }]),
          rows: table.rows.map(r => ({
            ...r,
            [state.outputColumnId]: r[state.formulaState.column] / columnTotal,
          })),
        };
      }

      if (state.formulaState.percentageType === 'group') {
        const groupTotals: Record<string, number> = {};

        table.rows.forEach(row => {
          if (groupTotals[row[formulaState.otherColumn]]) {
            groupTotals[row[formulaState.otherColumn]] += row[state.formulaState.column];
          } else {
            groupTotals[row[formulaState.otherColumn]] = row[state.formulaState.column];
          }
        });
        return {
          columns: table.columns.concat([{ id: state.outputColumnId, dataType: 'number' }]),
          rows: table.rows.map(r => ({
            ...r,
            [state.outputColumnId]:
              r[state.formulaState.column] / groupTotals[row[formulaState.otherColumn]],
          })),
        };
      }
      if (state.formulaState.percentageType === 'row') {
        return {
          columns: table.columns.concat([{ id: state.outputColumnId, dataType: 'number' }]),
          rows: table.rows.map(r => ({
            ...r,
            [state.outputColumnId]: r[state.formulaState.column] / row[formulaState.otherColumn],
          })),
        };
      }

      return table;
    },
    renderEditor: (node, table, dispatch) => {
      return (
        <>
          <EuiFormRow label="Column">
            <EuiSelect
              options={[{ text: 'No column', value: null }].concat(
                table.columns
                  .filter(c => c.dataType === 'number')
                  .map(c => ({ text: c.label || c.id, value: c.id }))
              )}
              value={node.state.formulaState?.column ?? null}
              onChange={e => {
                dispatch({
                  type: 'SET_NODE',
                  nodeId: node.id,
                  newState: {
                    ...node.state,
                    formulaState: { ...(node.state.formulaState || {}), column: e.target.value },
                  },
                });
              }}
            />
          </EuiFormRow>
          <EuiFormRow label="Percentage type">
            <EuiSelect
              options={[
                { text: 'Of all rows', value: '' },
                { text: 'Of group', value: 'group' },
                { text: 'Of two columns within same row', value: 'row' },
              ]}
              value={node.state.formulaState?.percentageType ?? ''}
              onChange={e => {
                dispatch({
                  type: 'SET_NODE',
                  nodeId: node.id,
                  newState: {
                    ...node.state,
                    formulaState: {
                      ...(node.state.formulaState || {}),
                      percentageType: e.target.value,
                    },
                  },
                });
              }}
            />
          </EuiFormRow>
          {node.state.formulaState?.percentageType === 'group' ? (
            <EuiFormRow label="Group by column">
              <EuiSelect
                options={[{ text: 'No column', value: '' }].concat(
                  table.columns
                    .filter(c => c.id !== node.state.formulaState.column)
                    .map(c => ({ text: c.label || c.id, value: c.id }))
                )}
                value={node.state.formulaState?.otherColumn ?? ''}
                onChange={e => {
                  dispatch({
                    type: 'SET_NODE',
                    nodeId: node.id,
                    newState: {
                      ...node.state,
                      formulaState: {
                        ...node.state.formulaState,
                        otherColumn: e.target.value,
                      },
                    },
                  });
                }}
              />
            </EuiFormRow>
          ) : null}
          {node.state.formulaState?.percentageType === 'row' ? (
            <EuiFormRow label="Divide by column">
              <EuiSelect
                options={[{ text: 'No column', value: null }].concat(
                  table.columns
                    .filter(c => c.id !== node.state.formulaState.column && c.dataType === 'number')
                    .map(c => ({ text: c.label || c.id, value: c.id }))
                )}
                value={node.state.formulaState?.otherColumn ?? null}
                onChange={e => {
                  dispatch({
                    type: 'SET_NODE',
                    nodeId: node.id,
                    newState: {
                      ...node.state,
                      formulaState: {
                        ...node.state.formulaState,
                        otherColumn: e.target.value,
                      },
                    },
                  });
                }}
              />
            </EuiFormRow>
          ) : null}
        </>
      );
    },
  },
};
