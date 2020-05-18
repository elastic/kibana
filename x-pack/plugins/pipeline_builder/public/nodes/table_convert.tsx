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
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiComboBox,
  EuiButton,
  EuiIcon,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiLink,
  euiDragDropReorder,
} from '@elastic/eui';
import { NodeDefinition, RenderNode, DataType, PipelineColumn, PipelineTable } from '../types';
import { useLoader } from '../state';

interface TableConvertState {
  columns: PipelineColumn[];
}

// Recursive function to determine if the _source of a document
// contains a known path.
export function getPath(obj: unknown, path: Array<string | number>, i = 0): unknown[] {
  if (obj == null) {
    return [];
  }

  const newPath = path.map(p => (Number.isInteger(parseInt(p, 10)) ? parseInt(p, 10) : p));

  if (i === path.length) {
    return Array.isArray(obj) ? obj : [obj];
  }

  if (Array.isArray(obj)) {
    if (Number.isInteger(newPath[i])) {
      return obj.flatMap(child => getPath(child[newPath[i]], newPath, i + 1));
    }
    return obj.flatMap(child => getPath(child, newPath, i));
  }

  if (typeof obj === 'object') {
    // Because Elasticsearch flattens paths, dots in the field name are allowed
    // as JSON keys. For example, { 'a.b': 10 }
    const partialKeyMatches = Object.getOwnPropertyNames(obj)
      .map(key => key.split('.'))
      .filter(keyPaths => keyPaths.every((key, keyIndex) => key === newPath[keyIndex + i]));

    if (partialKeyMatches.length) {
      return partialKeyMatches.flatMap(keyPaths => {
        return getPath(
          (obj as Record<string, unknown>)[keyPaths.join('.')],
          newPath,
          i + keyPaths.length
        );
      });
    }

    return getPath((obj as Record<string, unknown>)[newPath[i]], newPath, i + 1);
  }

  return [];
}

export function collectRows(obj: unknown, paths: string[]) {
  const rows: Array<Record<string, unknown>> = [];

  paths.forEach(path => {
    // const lowestLevelValues = getPath(obj, path.split('.'));
    // let totalValues = 0;
    // for (let i = 0; i < path.split('.').length;i++) {

    // }
    const values = getPath(obj, path.split('.'));
    if (values.length === rows.length) {
      values.forEach((v, i) => {
        rows[i][path] = v;
      });
    } else if (values.length < rows.length) {
      if (values.length === 1) {
        rows.forEach(r => {
          r[path] = values[0];
        });
      }
    } else if (values.length > rows.length) {
      if (rows.length === 1) {
        const template = rows[0];
        values.forEach((v, i) => {
          rows[i] = { ...template, [path]: v };
        });
      } else {
        values.forEach((v, i) => {
          if (rows.length === i) {
            rows.push({ [path]: v });
          } else {
            rows[i][path] = v;
          }
        });
      }
    }
  });
  return rows;
}

export function getFlattenedArrayPaths(input: any, prefix: string = ''): string[] {
  if (!input) {
    return [prefix];
  }

  const topLevelPaths = new Set<string>();

  if (Array.isArray(input)) {
    input.forEach(v => {
      if (Array.isArray(v)) {
        v.forEach((subV, i) => {
          topLevelPaths.add(prefix + '.' + i);
          getFlattenedArrayPaths(subV, prefix + '.' + i).forEach(p => topLevelPaths.add(p));
        });
      } else if (v && typeof v === 'object') {
        getFlattenedArrayPaths(v, prefix).forEach(p => topLevelPaths.add(p));
      }
    });
  } else if (input && typeof input === 'object') {
    Object.entries(input).forEach(([key, v]) => {
      if (v && (typeof v === 'object' || Array.isArray(v))) {
        getFlattenedArrayPaths(v, prefix ? prefix + '.' + key : key).forEach(p =>
          topLevelPaths.add(p)
        );
      } else {
        topLevelPaths.add(prefix ? prefix + '.' + key : key);
      }
    });
  }

  return Array.from(topLevelPaths);
}

function TableConvert({ node, dispatch }: RenderNode<TableConvertState>) {
  const loader = useLoader();

  const inputData =
    loader.lastData &&
    loader.lastData[node.inputNodeIds[0]] &&
    loader.lastData[node.inputNodeIds[0]].value;

  const paths = getFlattenedArrayPaths(inputData);
  const converted = !node.state.columns.length && inputData ? collectRows(inputData, paths) : null;

  let columns: PipelineColumn[] = node.state.columns.length
    ? node.state.columns
    : paths.map(path => ({ id: path })) || [];

  if (converted) {
    columns = columns.map(c => ({ ...c, dataType: guessDataType(c.id, converted) }));
  }

  return (
    <EuiDragDropContext
      onDragEnd={({ source, destination }) => {
        if (source && destination) {
          const items = euiDragDropReorder(columns, source.index, destination.index);

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
      {converted && !node.state.columns.length ? (
        <EuiText>Automatically detecting columns from input...</EuiText>
      ) : (
        <EuiLink
          onClick={() => {
            dispatch({
              type: 'SET_NODE',
              nodeId: node.id,
              newState: { ...node.state, columns: [] },
            });
          }}
        >
          <EuiIcon type="refresh" />
          Reset columns to all detected
        </EuiLink>
      )}

      <EuiDroppable droppableId={'a'}>
        {columns.map((col, index) => (
          <EuiDraggable index={index} key={col.id} draggableId={col.id || `draggable${index}`}>
            <EuiFlexGroup className="pipelineBuilder__tableConvert__column">
              <EuiFlexItem grow={true}>
                <EuiText>{col.id}</EuiText>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiText>
                  <em>{col.dataType}</em>
                </EuiText>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  size="s"
                  color="danger"
                  iconType="trash"
                  onClick={() => {
                    dispatch({
                      type: 'SET_NODE',
                      nodeId: node.id,
                      newState: {
                        ...node.state,
                        columns: columns.filter(c => c.id !== col.id),
                      },
                    });
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiDraggable>
        ))}
      </EuiDroppable>

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiComboBox
            placeholder="Add column"
            options={(paths || []).map(path => ({ label: path }))}
            onChange={([choice]) => {
              dispatch({
                type: 'SET_NODE',
                nodeId: node.id,
                newState: {
                  ...node.state,
                  columns: [...columns, { path: choice.label }],
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
            noSuggestions={!converted}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiDragDropContext>
  );
}

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
    } as TableConvertState;
  },

  renderReact: TableConvert,

  async run(node, inputs, inputNodeIds, deps): Promise<PipelineTable> {
    const state = node.state;
    const inputData = inputs[inputNodeIds[0]]?.value;
    const paths = state.columns.length
      ? state.columns.map(({ id }) => id)
      : getFlattenedArrayPaths(inputData);

    const columns = state.columns.length
      ? state.columns.map(({ id, label }) => ({ id, label }))
      : paths.map(p => ({ id: p, label: p }));
    const rows = collectRows(inputData, paths);

    return {
      columns: columns.map(c => ({ ...c, dataType: guessDataType(c.id, rows) })),
      rows,
    };
  },
};

function guessDataType(id: string, rows: PipelineTable['rows']): DataType {
  const isString = rows.every(row => typeof row[id] === 'string');
  if (isString) {
    return 'string';
  }
  const isBoolean = rows.every(row => typeof row[id] === 'boolean');
  if (isBoolean) {
    return 'boolean';
  }
  const isNumber = rows.every(row => typeof row[id] === 'number');
  if (isNumber) {
    return 'number';
  }

  return 'other';
}
