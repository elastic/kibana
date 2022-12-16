/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { has, get } from 'lodash/fp';
import type { ColumnHeaderOptions } from '../../../../../../common/types';

import type { BrowserFields } from '../../../../../common/containers/source';
import { DEFAULT_COLUMN_MIN_WIDTH, DEFAULT_DATE_COLUMN_MIN_WIDTH } from '../constants';
import { defaultColumnHeaderType } from './default_headers';

/**
 * Returns the root category for fields that are only one level, e.g. `_id` or `test_field_1`
 *
 * The `base` category will be returned for fields that are members of `base`,
 * e.g. the `@timestamp`, `_id`, and `message` fields.
 *
 * The field name will be echoed-back for all other fields, e.g. `test_field_1`
 */
export const getRootCategory = ({
  browserFields,
  field,
}: {
  browserFields: BrowserFields;
  field: string;
}): string => (has(`base.fields.${field}`, browserFields) ? 'base' : field);

/** Enriches the column headers with field details from the specified browserFields */
export const getColumnHeaders = (
  headers: ColumnHeaderOptions[],
  browserFields: BrowserFields
): ColumnHeaderOptions[] => {
  return headers
    ? headers.map((header) => {
        const splitHeader = header.id.split('.'); // source.geo.city_name -> [source, geo, city_name]
        const category =
          splitHeader.length > 1
            ? splitHeader[0]
            : getRootCategory({ field: header.id, browserFields });

        return {
          ...header,
          ...get([category, 'fields', header.id], browserFields),
        };
      })
    : [];
};

export const getColumnWidthFromType = (type: string): number =>
  type !== 'date' ? DEFAULT_COLUMN_MIN_WIDTH : DEFAULT_DATE_COLUMN_MIN_WIDTH;

/**
 * Returns the column header with field details from the defaultHeaders
 */
export const getColumnHeader = (
  fieldName: string,
  defaultHeaders: ColumnHeaderOptions[]
): ColumnHeaderOptions => ({
  columnHeaderType: defaultColumnHeaderType,
  id: fieldName,
  initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
  ...(defaultHeaders.find((c) => c.id === fieldName) ?? {}),
});
