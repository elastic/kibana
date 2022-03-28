/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiLoadingSpinner } from '@elastic/eui';
import { pickBy } from 'lodash/fp';
import styled from 'styled-components';

import { TimelineId } from '../../../../../public/types';
import type { BrowserField, BrowserFields } from '../../../../../common/search_strategy';
import { defaultHeaders } from '../../../../store/t_grid/defaults';
import { ColumnHeaderOptions } from '../../../../../common';

export const LoadingSpinner = styled(EuiLoadingSpinner)`
  cursor: pointer;
  position: relative;
  top: 3px;
`;

LoadingSpinner.displayName = 'LoadingSpinner';

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
export function filterBrowserFieldsByFieldName({
  browserFields,
  substring,
}: {
  browserFields: BrowserFields;
  substring: string;
}): BrowserFields {
  const trimmedSubstring = substring.trim();
  // an empty search param will match everything
  if (trimmedSubstring === '') {
    return browserFields;
  }
  const result: Record<string, Partial<BrowserField>> = {};
  for (const [categoryName, categoryDescriptor] of Object.entries(browserFields)) {
    if (!categoryDescriptor.fields) {
      // ignore any category that is missing fields. This shouldn't happen.
      // eslint-disable-next-line no-continue
      continue;
    }
    let hadAMatch = false;
    const filteredFields: Record<string, Partial<BrowserField>> = {};
    for (const [fieldName, fieldDescriptor] of Object.entries(categoryDescriptor.fields)) {
      const fieldNameFromDescriptor = fieldDescriptor.name;
      if (!fieldNameFromDescriptor) {
        // Ignore any field that is missing a name in its descriptor. This shouldn't happen.
        // eslint-disable-next-line no-continue
        continue;
      }
      if (fieldNameFromDescriptor !== null && fieldNameFromDescriptor.includes(trimmedSubstring)) {
        // this field is a match
        hadAMatch = true;
        filteredFields[fieldName] = fieldDescriptor;
      }
    }
    if (hadAMatch) {
      result[categoryName] = {
        ...browserFields[categoryName],
        fields: filteredFields
      }
    }
  }
  return result;
}
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

export const CATEGORY_TABLE_CLASS_NAME = 'category-table';
export const CLOSE_BUTTON_CLASS_NAME = 'close-button';
export const RESET_FIELDS_CLASS_NAME = 'reset-fields';

export const CountBadge = styled(EuiBadge)`
  margin-left: 5px;
` as unknown as typeof EuiBadge;

CountBadge.displayName = 'CountBadge';

export const CategoryName = styled.span<{ bold: boolean }>`
  font-weight: ${({ bold }) => (bold ? 'bold' : 'normal')};
`;
CategoryName.displayName = 'CategoryName';

export const CategorySelectableContainer = styled.div`
  width: 300px;
`;
CategorySelectableContainer.displayName = 'CategorySelectableContainer';
