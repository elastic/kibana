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
  EuiSelectable,
  EuiProgress,
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  euiDragDropReorder,
  EuiComboBox,
} from '@elastic/eui';
import { NodeDefinition, RenderNode } from '../types';
import { useLoader } from '../state';

interface ColumnDef {
  path: string;
  label?: string;
}

interface TableConvertState {
  columns: ColumnDef[];
  autoColumns: boolean;
}

function flattenKeys(input: any, prefix?: string): string[] {
  if (!input) {
    return [];
  }

  const outputKeys = new Set<string>();

  if (Array.isArray(input)) {
    input.forEach(o => {
      if (o && typeof o === 'object') {
        flattenKeys(o).forEach(k => outputKeys.add(k));
      }
    });
    return Array.from(outputKeys);
  }

  if (typeof input === 'object') {
    Object.keys(input).forEach(key => {
      outputKeys.add(key);
      flattenKeys(input[key])
        .map(k => key + '.' + k)
        .forEach(k => outputKeys.add(k));
    });
  }

  return Array.from(outputKeys);
}

function findArray(input: any, prefix?: string): { prefix?: string; value: any[] } {
  if (!input) {
    return { prefix, value: [] };
  }

  if (Array.isArray(input)) {
    if (input.every(o => o && typeof o === 'object')) {
      return { prefix, value: input };
    }
    if (input.length > 0) {
      const match = input.find(o => findArray(o, prefix));
      if (match) {
        return { prefix, value: match };
      }
    }
    return { prefix, value: [] };
  }

  if (typeof input === 'object') {
    const matches = Object.keys(input)
      .map(key => {
        return findArray(input[key], prefix ? prefix + '.' + key : key);
      })
      .filter(m => m.value.length);
    if (matches.length) {
      return matches[0];
    }
  }

  return { prefix, value: [] };
}

function convertToTable(state: TableConvertState, input: object) {
  if (!input.value) {
    return { rows: [], columns: [] };
  }

  const { prefix, value } = findArray(input.value, '');
  let rewrittenValue: unknown[] = [];

  const columnIds = new Set<string>();
  value.forEach(val => {
    if (val && typeof val === 'object') {
      Object.entries(val).forEach(([key, v]) => {
        columnIds.add(prefix ? prefix + '.' + key : key);
      });
      rewrittenValue = rewrittenValue.concat(
        Object.fromEntries(
          Object.entries(val).map(([key, v]) => {
            return [prefix ? prefix + '.' + key : key, v];
          })
        )
      );
    } else if (Array.isArray(val)) {
      val.forEach((_, i) => {
        columnIds.add(prefix ? prefix + '.' + i : String(i));
      });
    }
  });

  return {
    columns: Array.from(columnIds).map(id => ({
      id,
      label: id,
    })),
    rows: rewrittenValue,
  };
}

function TableConvert({ node, dispatch }: RenderNode<TableConvertState>) {
  const loader = useLoader();

  const previousNode = node.inputNodeIds[0];
  const inputData = loader.lastData[previousNode];

  const flattened = inputData?.value ? flattenKeys(inputData.value) : [];

  return (
    <EuiDragDropContext
      onDragEnd={({ source, destination }) => {
        if (source && destination) {
          const items = euiDragDropReorder(node.state.columns, source.index, destination.index);

          dispatch({
            type: 'SET_NODE',
            nodeId: node.id,
            newState: {
              ...node.state,
              columns: items,
            },
          });
        }
      }}
    >
      {node.state.columns.map((col, index) => (
        <EuiDraggable index={index} key={col.path} draggableId={col.path}>
          <EuiFormRow
            label={i18n.translate('xpack.pipeline_builder.tableConvert.columnPathLabel', {
              defaultMessage: 'Dotted path to column',
            })}
          >
            <EuiFieldText onChange={() => {}} value={col.path} />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('xpack.pipeline_builder.tableConvert.columnLabel', {
              defaultMessage: 'Column label',
            })}
          >
            <EuiFieldText onChange={() => {}} value={col.label} />
          </EuiFormRow>
        </EuiDraggable>
      ))}

      <EuiComboBox
        options={(flattened || []).map(key => ({
          label: key,
          key,
          value: key,
          // checked: undefined,
          // isGroupLabel: false,
        }))}
        onChange={([choice]) => {
          dispatch({
            type: 'SET_NODE',
            nodeId: node.id,
            newState: {
              ...node.state,
              columns: [...node.state.columns, { path: choice.id }],
            },
          });
        }}
        fullWidth
        singleSelection={{ asPlainText: true }}
        onCreateOption={value => {
          dispatch({
            type: 'SET_NODE',
            nodeId: node.id,
            newState: {
              ...node.state,
              columns: [...node.state.columns, { path: value }],
            },
          });
        }}
        noSuggestions={!flattened}
      />
    </EuiDragDropContext>
  );
}

//   <EuiSelectable
//     options={flattened.map(key => ({
//       label: key,
//       key,
//       value: key,
//       checked: undefined,
//       isGroupLabel: false,
//     }))}
//     onChange={() => {}}
//   >
//     {list => list}
//   </EuiSelectable>
// ) : null}

export const definition: NodeDefinition<TableConvertState> = {
  title: i18n.translate('xpack.pipeline_builder.tableConvertTitle', {
    defaultMessage: 'Convert JSON to tabular form',
  }),
  inputNodeTypes: ['json'],
  outputType: 'table',

  icon: 'visTable',

  initialize: () => {
    return {
      columns: [],
      autoColumns: true,
    } as TableConvertState;
  },

  renderReact: TableConvert,

  async run(state, inputs, deps) {
    return convertToTable(state, Object.values(inputs)[0]);
  },
};
