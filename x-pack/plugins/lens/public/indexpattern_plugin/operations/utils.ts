/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  IndexPatternPrivateState,
  IndexPatternColumn,
  BaseIndexPatternColumn,
} from '../indexpattern';

export function updateColumnParam<
  C extends BaseIndexPatternColumn & { params: object },
  K extends keyof C['params']
>(
  state: IndexPatternPrivateState,
  currentColumn: C,
  paramName: K,
  value: C['params'][K]
): IndexPatternPrivateState {
  const columnId = Object.entries(state.columns).find(
    ([_, column]) => column === currentColumn
  )![0];

  if (!('params' in state.columns[columnId])) {
    throw new Error('Invariant: no params in this column');
  }

  return {
    ...state,
    columns: {
      ...state.columns,
      [columnId]: ({
        ...currentColumn,
        params: {
          ...currentColumn.params,
          [paramName]: value,
        },
      } as unknown) as IndexPatternColumn,
    },
  };
}
