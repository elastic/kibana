/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash/fp';

import { BrowserFields } from '../../../../../common/containers/source';
import { ColumnHeaderOptions } from '../../../../../timelines/store/timeline/model';
import {
  DEFAULT_COLUMN_MIN_WIDTH,
  DEFAULT_DATE_COLUMN_MIN_WIDTH,
  SHOW_CHECK_BOXES_COLUMN_WIDTH,
  EVENTS_VIEWER_ACTIONS_COLUMN_WIDTH,
  DEFAULT_ACTIONS_COLUMN_WIDTH,
  MINIMUM_ACTIONS_COLUMN_WIDTH,
} from '../constants';

/** Enriches the column headers with field details from the specified browserFields */
export const getColumnHeaders = (
  headers: ColumnHeaderOptions[],
  browserFields: BrowserFields
): ColumnHeaderOptions[] => {
  return headers.map((header) => {
    const splitHeader = header.id.split('.'); // source.geo.city_name -> [source, geo, city_name]

    return {
      ...header,
      ...get(
        [splitHeader.length > 1 ? splitHeader[0] : 'base', 'fields', header.id],
        browserFields
      ),
    };
  });
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
