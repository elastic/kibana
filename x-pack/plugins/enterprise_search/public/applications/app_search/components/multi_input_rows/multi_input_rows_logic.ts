/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

interface MultiInputRowsValues {
  values: string[];
  addedNewRow: boolean;
  hasEmptyValues: boolean;
  hasOnlyOneValue: boolean;
}

interface MultiInputRowsActions {
  addValue(): void;
  deleteValue(indexToDelete: number): { indexToDelete: number };
  editValue(index: number, newValueValue: string): { index: number; newValueValue: string };
}

interface MultiInputRowsProps {
  values: string[];
  id: string;
}

export const MultiInputRowsLogic = kea<
  MakeLogicType<MultiInputRowsValues, MultiInputRowsActions, MultiInputRowsProps>
>({
  path: (key: string) => ['enterprise_search', 'app_search', 'multi_input_rows_logic', key],
  key: (props) => props.id,
  actions: () => ({
    addValue: true,
    deleteValue: (indexToDelete) => ({ indexToDelete }),
    editValue: (index, newValueValue) => ({ index, newValueValue }),
  }),
  reducers: ({ props }) => ({
    values: [
      props.values,
      {
        // @ts-expect-error upgrade typescript v5.1.6
        addValue: (state) => [...state, ''],
        // @ts-expect-error upgrade typescript v5.1.6
        deleteValue: (state, { indexToDelete }) => {
          const newState = [...state];
          newState.splice(indexToDelete, 1);
          return newState;
        },
        // @ts-expect-error upgrade typescript v5.1.6
        editValue: (state, { index, newValueValue }) => {
          const newState = [...state];
          newState[index] = newValueValue;
          return newState;
        },
      },
    ],
    addedNewRow: [
      false,
      {
        addValue: () => true,
      },
    ],
  }),
  selectors: {
    hasEmptyValues: [(selectors) => [selectors.values], (values) => values.indexOf('') >= 0],
    hasOnlyOneValue: [(selectors) => [selectors.values], (values) => values.length <= 1],
  },
});
