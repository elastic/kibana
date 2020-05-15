/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { get } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  EuiFormRow,
  EuiFieldText,
  EuiSelectable,
  EuiProgress,
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiComboBox,
  EuiButton,
  euiDragDropReorder,
} from '@elastic/eui';
import jsonata from 'jsonata';
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

// function flattenKeys(input: any, prefix?: string): string[] {
//   if (!input) {
//     return [];
//   }

//   const outputKeys = new Set<string>();

//   if (Array.isArray(input)) {
//     input.forEach(o => {
//       if (o && typeof o === 'object') {
//         flattenKeys(o).forEach(k => outputKeys.add(k));
//       }
//     });
//     return Array.from(outputKeys);
//   }

//   if (typeof input === 'object') {
//     Object.keys(input).forEach(key => {
//       outputKeys.add(key);
//       flattenKeys(input[key])
//         .map(k => key + '.' + k)
//         .forEach(k => outputKeys.add(k));
//     });
//   }

//   return Array.from(outputKeys);
// }

// function findArray(input: any, columns: ColumnDef[]) {
//   if (!input) {
//     return { prefix, value: [] };
//   }

//   if (Array.isArray(input)) {
//     if (input.every(o => o && typeof o === 'object')) {
//       return { prefix, value: input };
//     }
//     if (input.length > 0) {
//       const match = input.find(o => findArray(o, prefix));
//       if (match) {
//         return { prefix, value: match };
//       }
//     }
//     return { prefix, value: [] };
//   }

//   if (typeof input === 'object') {
//     const matches = Object.keys(input)
//       .map(key => {
//         return findArray(input[key], prefix ? prefix + '.' + key : key);
//       })
//       .filter(m => m.value.length);
//     if (matches.length) {
//       return matches[0];
//     }
//   }

//   return { prefix, value: [] };
// }

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

// export function recursiveFlatten(input: unknown) {
//   if (!input || (typeof input !== 'object' && !Array.isArray(input))) {
//     return input;
//   }

//   if (Array.isArray(input)) {
//     if (input.length === 1) {
//       return recursiveFlatten(input[0]);
//     }
//     return input.flatMap(i => recursiveFlatten(i));
//   }

//   if (typeof input === 'object') {
//     const baseObject = Object.fromEntries(
//       Object.entries(input).filter(
//         ([a, value]) => !(value && (Array.isArray(value) || typeof value === 'object'))
//       )
//     );

//     const problematic = Object.entries(input).filter(
//       ([a, value]) => value && (Array.isArray(value) || typeof value === 'object')
//     );

//     const resolvedProblems: object[] = [];
//     problematic.forEach(([key, value]) => {
//       if (Array.isArray(value)) {
//         if (value.length === 1) {
//           const flattened = recursiveFlatten(value[0]);
//           if (Array.isArray(flattened)) {
//             // resolvedProblems.
//             flattened.forEach((v, i) => {
//               const n = recursiveFlatten(v);
//               if (resolvedProblems[i]) {
//                 resolvedProblems[i][key] = n;
//               } else {
//                 resolvedProblems[i] = { [key]: n };
//               }
//             });
//           } else if (typeof flattened === 'object') {
//             Object.entries(flattened).forEach(([k, v]) => {
//               baseObject[key + '.' + k] = v;
//             });
//           } else {
//             baseObject[key] = flattened;
//           }
//         } else {
//           value.forEach((v, i) => {
//             const flattened = recursiveFlatten(v);

//             if (resolvedProblems[i]) {
//               resolvedProblems[i][key] = flattened;
//             } else {
//               resolvedProblems[i] = { [key]: flattened };
//             }
//           });
//         }
//       } else if (typeof value === 'object') {
//         Object.entries(value).forEach(([k, v]) => {
//           baseObject[key + '.' + k] = recursiveFlatten(v);
//         });
//       }
//     });

//     if (resolvedProblems.length) {
//       return resolvedProblems.map(p => ({ ...baseObject, ...p }));
//     }
//     return baseObject;
//   }

//   return input;
// }

export function collectColumns(obj: unknown, paths: string[]) {
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

  //   if (obj == null) {
  //     return [];
  //   }

  //   const newPath = path.map(p => (Number.isInteger(parseInt(p, 10)) ? parseInt(p, 10) : p));

  //   if (i === path.length) {
  //     return Array.isArray(obj) ? obj : [obj];
  //   }

  //   if (Array.isArray(obj)) {
  //     if (Number.isInteger(newPath[i])) {
  //       return obj.flatMap(child => collectColumns(child[newPath[i]], newPath, i + 1));
  //     }
  //     return obj.flatMap(child => collectColumns(child, newPath, i));
  //   }

  //   if (typeof obj === 'object') {
  //     // Because Elasticsearch flattens paths, dots in the field name are allowed
  //     // as JSON keys. For example, { 'a.b': 10 }
  //     const partialKeyMatches = Object.getOwnPropertyNames(obj)
  //       .map(key => key.split('.'))
  //       .filter(keyPaths => keyPaths.every((key, keyIndex) => key === newPath[keyIndex + i]));

  //     if (partialKeyMatches.length) {
  //       return partialKeyMatches.flatMap(keyPaths => {
  //         return collectColumns(
  //           (obj as Record<string, unknown>)[keyPaths.join('.')],
  //           newPath,
  //           i + keyPaths.length
  //         );
  //       });
  //     }

  //     return collectColumns((obj as Record<string, unknown>)[newPath[i]], newPath, i + 1);
  //   }

  //   return [];
  // }
}

export function convertToTable(columns: ColumnDef[], input: object) {
  if (!input) {
    return { rows: [], columns };
  }

  // const { prefix, value } = findArray(input.value, '');
  // let rewrittenValue: unknown[] = [];

  // const columnIds = new Set<string>();
  // value.forEach(val => {
  //   if (val && typeof val === 'object') {
  //     Object.entries(val).forEach(([key, v]) => {
  //       columnIds.add(prefix ? prefix + '.' + key : key);
  //     });
  //     rewrittenValue = rewrittenValue.concat(
  //       Object.fromEntries(
  //         Object.entries(val).map(([key, v]) => {
  //           return [prefix ? prefix + '.' + key : key, v];
  //         })
  //       )
  //     );
  //   } else if (Array.isArray(val)) {
  //     val.forEach((_, i) => {
  //       columnIds.add(prefix ? prefix + '.' + i : String(i));
  //     });
  //   }
  // });

  // return {
  //   columns: Array.from(columnIds).map(id => ({
  //     id,
  //     label: id,
  //   })),
  //   rows: rewrittenValue,
  // };
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

  const previousNode = node.inputNodeIds[0];
  const inputData = loader.lastData[previousNode];

  // const flattenedTable = inputData?.value ? flattenTable(inputData.value) : null;
  // const flattened = inputData?.value ? flattenKeys(inputData.value) : [];
  const flattened = inputData?.value ? getFlattenedArrayPaths(inputData.value, '') : null;
  // const converted = inputData?.value ? convertToTable(node.state, inputData) : null;
  const converted = inputData?.value
    ? convertToTable(node.state.columns || flattened?.map(k => ({ id: k })), inputData!.value)
    : null;

  const columns: ColumnDef[] = node.state.columns.length
    ? node.state.columns
    : converted?.columns?.map(({ id, label }) => ({
        path: id,
        label,
      })) || [];

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
        <EuiButton
          size="s"
          onClick={() => {
            dispatch({
              type: 'SET_NODE',
              nodeId: node.id,
              newState: { ...node.state, columns },
            });
          }}
        >
          Confirm automatically generated columns
        </EuiButton>
      ) : null}

      <EuiDroppable droppableId={'a'}>
        {columns.map((col, index) => (
          <EuiDraggable index={index} key={col.path} draggableId={col.path}>
            <div className="pipelineBuilder__tableConvert__column">
              <EuiFormRow
                label={i18n.translate('xpack.pipeline_builder.tableConvert.columnPathLabel', {
                  defaultMessage: 'Dotted path to column',
                })}
                display="rowCompressed"
              >
                <EuiFieldText onChange={() => {}} value={col.path} />
              </EuiFormRow>
              <EuiFormRow
                label={i18n.translate('xpack.pipeline_builder.tableConvert.columnLabel', {
                  defaultMessage: 'Column label',
                })}
                display="rowCompressed"
              >
                <EuiFieldText onChange={() => {}} value={col.label} />
              </EuiFormRow>
            </div>
          </EuiDraggable>
        ))}
      </EuiDroppable>

      <EuiComboBox
        options={(flattened || []).map(key => ({
          label: key,
          key,
          value: key,
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
