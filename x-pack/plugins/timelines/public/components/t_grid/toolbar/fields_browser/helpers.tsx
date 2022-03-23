/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useReducer, useState } from 'react';
import { isEqual, pick, pickBy } from 'lodash/fp';

import { TimelineId } from '../../../../../public/types';
import type { BrowserField, BrowserFields } from '../../../../../common/search_strategy';
import { defaultHeaders } from '../../../../store/t_grid/defaults';
import { defaultColumnHeaderType } from '../../body/column_headers/default_headers';
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
  if (trimmedSubstring === '') {
    return browserFields;
  }

  // filter each category such that it only contains fields with field names
  // that contain the specified substring:
  const filteredBrowserFields: BrowserFields = Object.keys(browserFields).reduce(
    (filteredCategories, categoryId) => ({
      ...filteredCategories,
      [categoryId]: {
        ...browserFields[categoryId],
        fields: pickBy(
          ({ name }) => name != null && name.includes(trimmedSubstring),
          browserFields[categoryId].fields
        ),
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
 * Filters the selected `BrowserFields` to return a new collection where every
 * category contains at least one field that is present in the `columnHeaders`.
 */
export const filterSelectedBrowserFields = ({
  browserFields,
  columnHeaders,
}: {
  browserFields: BrowserFields;
  columnHeaders: ColumnHeaderOptions[];
}): BrowserFields => {
  const selectedFieldIds = new Set(columnHeaders.map(({ id }) => id));

  const filteredBrowserFields: BrowserFields = Object.keys(browserFields).reduce(
    (filteredCategories, categoryId) => ({
      ...filteredCategories,
      [categoryId]: {
        ...browserFields[categoryId],
        fields: pickBy(
          ({ name }) => name != null && selectedFieldIds.has(name),
          browserFields[categoryId].fields
        ),
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

/**
 * Returns only the column header options needed
 */
export const getCleanColumnHeader = (columnHeader: ColumnHeaderOptions): ColumnHeaderOptions => {
  return pick(
    ['id', 'columnHeaderType', 'displayAsText', 'initialWidth', 'linkField'],
    columnHeader
  );
};

interface SelectionState {
  toAdd: Record<string, true>;
  toRemove: Record<string, true>;
}

type SelectionAction =
  | { type: 'ADD'; names: string[] }
  | { type: 'REMOVE'; names: string[] }
  | { type: 'RESET' };

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
        case 'RESET': {
          return { toAdd: {}, toRemove: {} };
        }
        default:
          return state;
      }
    },
    { toAdd: {}, toRemove: {} }
  );

  const originalColumnHeaders = useMemo(
    // We need to clean the columnHeaders to prevent EuiDataGrid error
    () => columnHeaders.map(getCleanColumnHeader),
    [columnHeaders]
  );

  const [currentColumnHeaders, setCurrentColumnHeaders] = useState(originalColumnHeaders);
  const currentSelected = useMemo(
    () => new Set(currentColumnHeaders.map(({ id }) => id)),
    [currentColumnHeaders]
  );

  const isSelected = useCallback(
    (fieldName: string): boolean =>
      selectionState.toAdd[fieldName] != null ||
      (currentSelected.has(fieldName) && selectionState.toRemove[fieldName] == null),
    [selectionState, currentSelected]
  );

  const addSelected = useCallback((...names: string[]) => {
    dispatchSelection({ type: 'ADD', names });
  }, []);

  const removeSelected = useCallback((...names: string[]) => {
    dispatchSelection({ type: 'REMOVE', names });
  }, []);

  const setColumnHeaders = useCallback((newColumnHeaders: ColumnHeaderOptions[]) => {
    setCurrentColumnHeaders(newColumnHeaders);
    dispatchSelection({ type: 'RESET' });
  }, []);

  const getSelectedColumnHeaders = useCallback(
    (timelineId: string): ColumnHeaderOptions[] => [
      ...Object.keys(selectionState.toAdd).map((id) => getColumnHeader(timelineId, id)),
      ...currentColumnHeaders.filter(({ id }) => selectionState.toRemove[id] == null),
    ],
    [selectionState, currentColumnHeaders]
  );

  const getSelectedIds = useCallback(
    () => [
      ...Object.keys(selectionState.toAdd),
      ...currentColumnHeaders
        .filter(({ id }) => selectionState.toRemove[id] == null)
        .map(({ id }) => id),
    ],
    [selectionState, currentColumnHeaders]
  );

  const hasChanges: boolean = useMemo(
    () =>
      !isEqual(
        getSelectedIds(),
        originalColumnHeaders.map(({ id }) => id)
      ),
    [getSelectedIds, originalColumnHeaders]
  );

  return {
    hasChanges,
    addSelected,
    removeSelected,
    setColumnHeaders,
    isSelected,
    getSelectedColumnHeaders,
  };
};
