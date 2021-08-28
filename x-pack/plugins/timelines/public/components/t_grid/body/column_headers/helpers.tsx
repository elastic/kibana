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
import * as i18n from './translations';

const defaultActions: EuiDataGridColumnActions = {
  showSortAsc: { label: i18n.SORT_AZ },
  showSortDesc: { label: i18n.SORT_ZA },
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

/** Enriches the column headers with field details from the specified browserFields */
export const getColumnHeaders = (
  headers: ColumnHeaderOptions[],
  browserFields: BrowserFields
): ColumnHeaderOptions[] => {
  return headers
    ? headers.map((header) => {
        const splitHeader = header.id.split('.'); // source.geo.city_name -> [source, geo, city_name]

        // augment the header with metadata from browserFields:
        const augmentedHeader = {
          ...header,
          ...get(
            [splitHeader.length > 1 ? splitHeader[0] : 'base', 'fields', header.id],
            browserFields
          ),
        };

        const content = <>{header.display ?? header.displayAsText ?? header.id}</>;

        // return the augmentedHeader with additional properties used by `EuiDataGrid`
        return {
          ...augmentedHeader,
          actions: header.actions ?? defaultActions,
          defaultSortDirection: 'desc', // the default action when a user selects a field via `EuiDataGrid`'s `Pick fields to sort by` UI
          display: <>{content}</>,
          isSortable: allowSorting({
            browserField: getAllFieldsByName(browserFields)[header.id],
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
