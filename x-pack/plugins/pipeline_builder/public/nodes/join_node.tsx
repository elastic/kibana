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
import { NodeDefinition, RenderNode } from '../types';
import { useLoader } from '../state';

type JoinType = 'full' | 'left_outer' | 'right_outer' | 'inner';
interface JoinNodeState {
  leftColumn?: string;
  rightColumn?: string;
  joinType: JoinType;
}

function JoinNode({ node, dispatch }: RenderNode<JoinNodeState>) {
  const loader = useLoader();
  const { state, inputNodeIds } = node;
  const inputTables = inputNodeIds.map(id => loader.lastData[id]?.value);
  // const leftColumnId = inputNodeIds[0];
  // const rightColumnId = inputNodeIds[1];
  const leftTable = inputTables[0];
  const rightTable = inputTables[1];

  return (
    <div>
      <EuiFormRow
        label={i18n.translate('xpack.pipeline_builder.joinNode.joinTypeLabel', {
          defaultMessage: 'Join type',
        })}
      >
        <EuiSelect
          value={state.joinType}
          options={[
            { value: 'full', text: 'Full join' },
            { value: 'left_outer', text: 'Left outer join' },
            { value: 'right_outer', text: 'Right outer join' },
            { value: 'inner', text: 'Inner join' },
          ]}
          onChange={e => {
            dispatch({
              type: 'SET_NODE',
              nodeId: node.id,
              newState: { ...node.state, joinType: e.target.value },
            });
          }}
        />
      </EuiFormRow>

      {state.joinType !== 'full' ? (
        <EuiFlexGroup direction="row">
          <EuiFlexItem>
            <EuiFormRow
              label={i18n.translate('xpack.pipeline_builder.joinNode.joinColumnLabel', {
                defaultMessage: 'Column from {id}',
                values: { id: inputNodeIds[0] },
              })}
            >
              <EuiSelect
                value={state.leftColumn}
                options={leftTable ? leftTable.columns.map(({ id }) => ({ text: id })) : []}
                onChange={e => {
                  dispatch({
                    type: 'SET_NODE',
                    nodeId: node.id,
                    newState: { ...node.state, leftColumn: e.target.value },
                  });
                }}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow
              label={i18n.translate('xpack.pipeline_builder.joinNode.joinColumnLabel', {
                defaultMessage: 'Column from {id}',
                values: { id: inputNodeIds[1] },
              })}
            >
              <EuiSelect
                value={state.rightColumn}
                options={rightTable ? rightTable.columns.map(({ id }) => ({ text: id })) : []}
                onChange={e => {
                  dispatch({
                    type: 'SET_NODE',
                    nodeId: node.id,
                    newState: { ...node.state, rightColumn: e.target.value },
                  });
                }}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}
    </div>
  );
}

export const definition: NodeDefinition<JoinNodeState> = {
  title: i18n.translate('xpack.pipeline_builder.joinNodeTitle', {
    defaultMessage: 'Join two nodes',
  }),
  inputNodeTypes: ['table'],
  outputType: 'table',

  icon: 'aggregate',

  initialize(): JoinNodeState {
    return {
      joinType: 'full',
    };
  },

  renderReact: JoinNode,

  async run(state, inputs, inputNodeIds, deps) {
    const values = inputNodeIds.map(i => inputs[i]?.value);

    return joinTables(state.joinType, values[0], values[1], state.leftColumn, state.rightColumn);
  },
};

interface Table {
  columns: Array<{ id: string; label?: string }>;
  rows: Array<Record<string, unknown>>;
}

export function joinTables(
  joinType: JoinType,
  left: Table,
  right: Table,
  leftId?: string,
  rightId?: string
): Table {
  debugger;
  if (joinType === 'full') {
    return {
      columns: left.columns.concat(right.columns),
      rows: left.rows.concat(right.rows),
    };
  }

  if (!leftId) {
    leftId = left.columns[0].id;
  }
  if (!rightId) {
    rightId = right.columns[0].id;
  }

  if (joinType === 'left_outer') {
    return {
      columns: left.columns.concat(right.columns.filter(col => col.id !== rightId)),
      rows: left.rows.map(row => {
        const leftValue = row[leftId];
        const matchingRow = right.rows.find(row => row[rightId] === leftValue);
        return {
          ...row,
          [leftId]: matchingRow[rightId],
        };
      }),
    };
  }
  if (joinType === 'right_outer') {
    return {
      columns: right.columns.concat(left.columns.filter(col => col.id !== leftId)),
      rows: right.rows.map(row => {
        const rightValue = row[rightId];
        const matchingRow = left.rows.find(row => row[leftId] === rightValue);
        return {
          ...row,
          [rightId]: matchingRow[leftId],
        };
      }),
    };
  }

  if (joinType === 'inner') {
    return {
      columns: left.columns.concat(right.columns.filter(col => col.id !== rightId)),
      rows: left.rows
        .map(row => {
          const leftValue = row[leftId];
          const matchingRow = right.rows.find(row => row[rightId] === leftValue);
          if (!matchingRow) {
            return false;
          }
          return {
            ...row,
            [leftId]: matchingRow[rightId],
          };
        })
        .filter(row => !!row),
    };
  }
}
