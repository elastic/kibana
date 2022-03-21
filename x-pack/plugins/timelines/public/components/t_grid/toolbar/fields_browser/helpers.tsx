/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiLoadingSpinner } from '@elastic/eui';
import { filter, get, pickBy } from 'lodash/fp';
import styled from 'styled-components';

import { TimelineId } from '../../../../../public/types';
import type { BrowserField, BrowserFields } from '../../../../../common/search_strategy';
import { defaultHeaders } from '../../../../store/t_grid/defaults';
import { DEFAULT_CATEGORY_NAME } from '../../body/column_headers/default_headers';

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
