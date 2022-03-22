/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useReducer } from 'react';
import { filter, get, pickBy } from 'lodash/fp';

import { TimelineId } from '../../../../../public/types';
import type { BrowserField, BrowserFields } from '../../../../../common/search_strategy';
import { defaultHeaders } from '../../../../store/t_grid/defaults';
import {
  DEFAULT_CATEGORY_NAME,
  defaultColumnHeaderType,
} from '../../body/column_headers/default_headers';
import { ColumnHeaderOptions } from '../../../../../common';
import { DEFAULT_COLUMN_MIN_WIDTH } from '../../body/constants';

export const CATEGORY_TABLE_CLASS_NAME = 'category-table';
export const CLOSE_BUTTON_CLASS_NAME = 'close-button';
export const APPLY_BUTTON_CLASS_NAME = 'apply-button';
export const RESET_FIELDS_CLASS_NAME = 'reset-fields';

export const FIELD_BROWSER_WIDTH = 925;
export const TABLE_HEIGHT = 260;

/** Returns true if the specified category has at least one field */
export const categoryHasFields = (category: Partial<BrowserField>): boolean =>
  category.fields != null && Object.keys(category.fields).length > 0;

/** Returns the count of fields in the specified category */
export const getFieldCount = (category: Partial<BrowserField> | undefined): number =>
  category != null && category.fields != null ? Object.keys(category.fields).length : 0;

/**
 * Filters the specified `BrowserFields` to return a new collection where every
 * category contains at least one field name that matches the specified substring.
 */
export const filterBrowserFieldsByFieldName = ({
  browserFields,
  substring,
}: {
  browserFields: BrowserFields;
  substring: string;
}): BrowserFields => {
  const trimmedSubstring = substring.trim();

  // filter each category such that it only contains fields with field names
  // that contain the specified substring:
  const filteredBrowserFields: BrowserFields = Object.keys(browserFields).reduce(
    (filteredCategories, categoryId) => ({
      ...filteredCategories,
      [categoryId]: {
        ...browserFields[categoryId],
        fields: filter(
          (f) => f.name != null && f.name.includes(trimmedSubstring),
          browserFields[categoryId].fields
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        ).reduce((filtered, field) => ({ ...filtered, [field.name!]: field }), {}),
      },
    }),
    {}
  );

  // only pick non-empty categories from the filtered browser fields
  const nonEmptyCategories: BrowserFields = pickBy(
    (category) => categoryHasFields(category),
    filteredBrowserFields
  );

  return nonEmptyCategories;
};

/**
 * Returns a "virtual" category (e.g. default ECS) from the specified fieldIds
 */
export const createVirtualCategory = ({
  browserFields,
  fieldIds,
}: {
  browserFields: BrowserFields;
  fieldIds: string[];
}): Partial<BrowserField> => ({
  fields: fieldIds.reduce<Readonly<BrowserFields>>((fields, fieldId) => {
    const splitId = fieldId.split('.'); // source.geo.city_name -> [source, geo, city_name]
    const browserField = get(
      [splitId.length > 1 ? splitId[0] : 'base', 'fields', fieldId],
      browserFields
    );

    return {
      ...fields,
      ...(browserField
        ? {
            [fieldId]: {
              ...browserField,
              name: fieldId,
            },
          }
        : {}),
    };
  }, {}),
});

/** Merges the specified browser fields with the default category (i.e. `default ECS`) */
export const mergeBrowserFieldsWithDefaultCategory = (
  browserFields: BrowserFields
): BrowserFields => ({
  ...browserFields,
  [DEFAULT_CATEGORY_NAME]: createVirtualCategory({
    browserFields,
    fieldIds: defaultHeaders.map((header) => header.id),
  }),
});

export const getAlertColumnHeader = (timelineId: string, fieldId: string) =>
  timelineId === TimelineId.detectionsPage || timelineId === TimelineId.detectionsRulesDetailsPage
    ? defaultHeaders.find((c) => c.id === fieldId) ?? {}
    : {};

/**
 * Returns the column header for a field
 */
export const getColumnHeader = (timelineId: string, fieldName: string): ColumnHeaderOptions => ({
  columnHeaderType: defaultColumnHeaderType,
  id: fieldName,
  initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
  ...getAlertColumnHeader(timelineId, fieldName),
});

interface SelectionState {
  toAdd: Record<string, true>;
  toRemove: Record<string, true>;
}

type SelectionAction =
  | { type: 'ADD'; names: string[] }
  | { type: 'REMOVE'; names: string[] }
  | { type: 'SET'; add: string[]; remove: string[] };

export const useFieldSelection = (columnHeaders: ColumnHeaderOptions[]) => {
  const [selectionState, dispatchSelection] = useReducer(
    (state: SelectionState, action: SelectionAction) => {
      switch (action.type) {
        case 'ADD': {
          return action.names.reduce<SelectionState>(
            (newState, name) => {
              if (newState.toRemove[name] != null) {
                delete newState.toRemove[name];
              } else {
                newState.toAdd[name] = true;
              }
              return newState;
            },
            // new objects to allow mutations inside the reducer
            { toAdd: { ...state.toAdd }, toRemove: { ...state.toRemove } }
          );
        }
        case 'REMOVE': {
          return action.names.reduce<SelectionState>(
            (newState, name) => {
              if (newState.toAdd[name] != null) {
                delete newState.toAdd[name];
              } else {
                newState.toRemove[name] = true;
              }
              return newState;
            },
            // new objects to allow mutations inside the reducer
            { toAdd: { ...state.toAdd }, toRemove: { ...state.toRemove } }
          );
        }
        case 'SET': {
          return action.add.reduce<SelectionState>(
            (newState, name) => {
              // if a field is present in both `add` and `remove`, it will remain unchanged
              if (newState.toRemove[name] != null) {
                delete newState.toRemove[name];
              } else {
                newState.toAdd[name] = true;
              }
              return newState;
            },
            // new objects to allow mutations inside the reducer
            {
              toAdd: {},
              toRemove: Object.fromEntries(
                action.remove.map<[string, true]>((name) => [name, true])
              ),
            }
          );
        }
        default:
          return state;
      }
    },
    { toAdd: {}, toRemove: {} }
  );

  const currentColumnNames = useMemo(() => columnHeaders.map(({ id }) => id), [columnHeaders]);
  const currentSelected = useMemo(() => new Set(currentColumnNames), [currentColumnNames]);

  const addSelected = useCallback((...names: string[]) => {
    dispatchSelection({ type: 'ADD', names });
  }, []);

  const removeSelected = useCallback((...names: string[]) => {
    dispatchSelection({ type: 'REMOVE', names });
  }, []);

  const setSelected = useCallback(
    (fieldNames: string[]) => {
      // To set the selected fields we need to put all current fields to remove and the new ones to add
      // The reducer will take care of any duplicity between `add` and `remove` fields
      dispatchSelection({ type: 'SET', add: fieldNames, remove: currentColumnNames });
    },
    [currentColumnNames]
  );

  const hasChanges: boolean = useMemo(
    () =>
      Object.keys(selectionState.toAdd).length > 0 ||
      Object.keys(selectionState.toRemove).length > 0,
    [selectionState]
  );

  const isSelected = useCallback(
    (fieldName: string): boolean =>
      selectionState.toAdd[fieldName] != null ||
      (currentSelected.has(fieldName) && selectionState.toRemove[fieldName] == null),
    [selectionState, currentSelected]
  );

  const getSelectedColumnHeaders = useCallback(
    (timelineId: string): ColumnHeaderOptions[] => [
      ...Object.keys(selectionState.toAdd).map((id) => getColumnHeader(timelineId, id)),
      ...columnHeaders.filter(({ id }) => selectionState.toRemove[id] == null),
    ],
    [selectionState, columnHeaders]
  );

  return {
    hasChanges,
    addSelected,
    removeSelected,
    setSelected,
    isSelected,
    getSelectedColumnHeaders,
  };
};
