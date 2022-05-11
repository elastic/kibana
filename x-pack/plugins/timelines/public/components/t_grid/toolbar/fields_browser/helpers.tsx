/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiLoadingSpinner } from '@elastic/eui';
import styled from 'styled-components';

import { TimelineId } from '../../../../types';
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
  // an empty search param will match everything, so return the original browserFields
  if (trimmedSubstring === '') {
    return browserFields;
  }
  const result: Record<string, Partial<BrowserField>> = {};
  for (const [categoryName, categoryDescriptor] of Object.entries(browserFields)) {
    if (!categoryDescriptor.fields) {
      // ignore any category that is missing fields. This is not expected to happen.
      // eslint-disable-next-line no-continue
      continue;
    }

    // keep track of whether this category had a matching field, if so, we should emit it into the result
    let hadAMatch = false;

    // The fields that matched, for this `categoryName`
    const filteredFields: Record<string, Partial<BrowserField>> = {};

    for (const [fieldName, fieldDescriptor] of Object.entries(categoryDescriptor.fields)) {
      // For historical reasons, we consider the name as it appears on the field descriptor, not the `fieldName` (attribute name) itself.
      // It is unclear if there is any point in continuing to do this.
      const fieldNameFromDescriptor = fieldDescriptor.name;

      if (!fieldNameFromDescriptor) {
        // Ignore any field that is missing a name in its descriptor. This is not expected to happen.
        // eslint-disable-next-line no-continue
        continue;
      }

      // Check if this field matches (via substring comparison) the passed substring
      if (fieldNameFromDescriptor !== null && fieldNameFromDescriptor.includes(trimmedSubstring)) {
        // this field is a match, so we should emit this category into the result object.
        hadAMatch = true;

        // emit this field
        filteredFields[fieldName] = fieldDescriptor;
      }
    }

    if (hadAMatch) {
      // if at least one field matches, emit the category, but replace the `fields` attribute with the filtered fields
      result[categoryName] = {
        ...browserFields[categoryName],
        fields: filteredFields,
      };
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

  const result: Record<string, Partial<BrowserField>> = {};

  for (const [categoryName, categoryDescriptor] of Object.entries(browserFields)) {
    if (!categoryDescriptor.fields) {
      // ignore any category that is missing fields. This is not expected to happen.
      // eslint-disable-next-line no-continue
      continue;
    }

    // keep track of whether this category had a selected field, if so, we should emit it into the result
    let hadSelected = false;

    // The selected fields for this `categoryName`
    const selectedFields: Record<string, Partial<BrowserField>> = {};

    for (const [fieldName, fieldDescriptor] of Object.entries(categoryDescriptor.fields)) {
      // For historical reasons, we consider the name as it appears on the field descriptor, not the `fieldName` (attribute name) itself.
      // It is unclear if there is any point in continuing to do this.
      const fieldNameFromDescriptor = fieldDescriptor.name;

      if (!fieldNameFromDescriptor) {
        // Ignore any field that is missing a name in its descriptor. This is not expected to happen.
        // eslint-disable-next-line no-continue
        continue;
      }

      if (selectedFieldIds.has(fieldNameFromDescriptor)) {
        hadSelected = true;
        selectedFields[fieldName] = fieldDescriptor;
      }
    }

    if (hadSelected) {
      result[categoryName] = {
        ...browserFields[categoryName],
        fields: selectedFields,
      };
    }
  }
  return result;
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
