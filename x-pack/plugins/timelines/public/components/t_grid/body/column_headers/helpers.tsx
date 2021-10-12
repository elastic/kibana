/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridColumnActions } from '@elastic/eui';
import { get, keyBy } from 'lodash/fp';
import React from 'react';

import type {
  BrowserField,
  BrowserFields,
} from '../../../../../common/search_strategy/index_fields';
import type { ColumnHeaderOptions } from '../../../../../common/types/timeline';
import {
  DEFAULT_COLUMN_MIN_WIDTH,
  DEFAULT_DATE_COLUMN_MIN_WIDTH,
  SHOW_CHECK_BOXES_COLUMN_WIDTH,
  EVENTS_VIEWER_ACTIONS_COLUMN_WIDTH,
  DEFAULT_ACTIONS_COLUMN_WIDTH,
  MINIMUM_ACTIONS_COLUMN_WIDTH,
} from '../constants';
import { allowSorting } from '../helpers';

const defaultActions: EuiDataGridColumnActions = {
  showSortAsc: true,
  showSortDesc: true,
};

const getAllBrowserFields = (browserFields: BrowserFields): Array<Partial<BrowserField>> =>
  Object.values(browserFields).reduce<Array<Partial<BrowserField>>>(
    (acc, namespace) => [
      ...acc,
      ...Object.values(namespace.fields != null ? namespace.fields : {}),
    ],
    []
  );

const getAllFieldsByName = (
  browserFields: BrowserFields
): { [fieldName: string]: Partial<BrowserField> } =>
  keyBy('name', getAllBrowserFields(browserFields));

/**
 * Valid built-in schema types for the `schema` property of `EuiDataGridColumn`
 * are enumerated in the following comment in the EUI repository (permalink):
 * https://github.com/elastic/eui/blob/edc71160223c8d74e1293501f7199fba8fa57c6c/src/components/datagrid/data_grid_types.ts#L417
 */
export type BUILT_IN_SCHEMA = 'boolean' | 'currency' | 'datetime' | 'numeric' | 'json';

/**
 * Returns a valid value for the `EuiDataGridColumn` `schema` property, or
 * `undefined` when the specified `BrowserFields` `type` doesn't match a
 * built-in schema type
 *
 * Notes:
 *
 * - At the time of this writing, the type definition of the
 * `EuiDataGridColumn` `schema` property is:
 *
 * ```ts
 * schema?: string;
 * ```
 * - At the time of this writing, Elasticsearch Field data types are documented here:
 * https://www.elastic.co/guide/en/elasticsearch/reference/7.14/mapping-types.html
 */
export const getSchema = (type: string | undefined): BUILT_IN_SCHEMA | undefined => {
  switch (type) {
    case 'date': // fall through
    case 'date_nanos':
      return 'datetime';
    case 'double': // fall through
    case 'long': // fall through
    case 'number':
      return 'numeric';
    case 'object':
      return 'json';
    case 'boolean':
      return 'boolean';
    default:
      return undefined;
  }
};

/** Enriches the column headers with field details from the specified browserFields */
export const getColumnHeaders = (
  headers: ColumnHeaderOptions[],
  browserFields: BrowserFields
): ColumnHeaderOptions[] => {
  const browserFieldByName = getAllFieldsByName(browserFields);
  return headers
    ? headers.map((header) => {
        const splitHeader = header.id.split('.'); // source.geo.city_name -> [source, geo, city_name]

        const browserField: Partial<BrowserField> | undefined = browserFieldByName[header.id];

        // augment the header with metadata from browserFields:
        const augmentedHeader = {
          ...header,
          ...get(
            [splitHeader.length > 1 ? splitHeader[0] : 'base', 'fields', header.id],
            browserFields
          ),
          schema: header.schema ?? getSchema(browserField?.type),
        };

        const content = <>{header.display ?? header.displayAsText ?? header.id}</>;

        // return the augmentedHeader with additional properties used by `EuiDataGrid`
        return {
          ...augmentedHeader,
          actions: header.actions ?? defaultActions,
          defaultSortDirection: 'desc', // the default action when a user selects a field via `EuiDataGrid`'s `Pick fields to sort by` UI
          display: <>{content}</>,
          isSortable: allowSorting({
            browserField,
            fieldName: header.id,
          }),
        };
      })
    : [];
};

export const getColumnWidthFromType = (type: string): number =>
  type !== 'date' ? DEFAULT_COLUMN_MIN_WIDTH : DEFAULT_DATE_COLUMN_MIN_WIDTH;

/** Returns the (fixed) width of the Actions column */
export const getActionsColumnWidth = (
  isEventViewer: boolean,
  showCheckboxes = false,
  additionalActionWidth = 0
): number => {
  const checkboxesWidth = showCheckboxes ? SHOW_CHECK_BOXES_COLUMN_WIDTH : 0;
  const actionsColumnWidth =
    checkboxesWidth +
    (isEventViewer ? EVENTS_VIEWER_ACTIONS_COLUMN_WIDTH : DEFAULT_ACTIONS_COLUMN_WIDTH) +
    additionalActionWidth;

  return actionsColumnWidth > MINIMUM_ACTIONS_COLUMN_WIDTH + checkboxesWidth
    ? actionsColumnWidth
    : MINIMUM_ACTIONS_COLUMN_WIDTH + checkboxesWidth;
};
