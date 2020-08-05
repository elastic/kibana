/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getActionsColumnWidth, getColumnWidthFromType } from './helpers';
import {
  DEFAULT_COLUMN_MIN_WIDTH,
  DEFAULT_DATE_COLUMN_MIN_WIDTH,
  DEFAULT_ACTIONS_COLUMN_WIDTH,
  EVENTS_VIEWER_ACTIONS_COLUMN_WIDTH,
  SHOW_CHECK_BOXES_COLUMN_WIDTH,
} from '../constants';
import '../../../../../common/mock/match_media';

describe('helpers', () => {
  describe('getColumnWidthFromType', () => {
    test('it returns the expected width for a non-date column', () => {
      expect(getColumnWidthFromType('keyword')).toEqual(DEFAULT_COLUMN_MIN_WIDTH);
    });

    test('it returns the expected width for a date column', () => {
      expect(getColumnWidthFromType('date')).toEqual(DEFAULT_DATE_COLUMN_MIN_WIDTH);
    });
  });

  describe('getActionsColumnWidth', () => {
    test('returns the default actions column width when isEventViewer is false', () => {
      expect(getActionsColumnWidth(false)).toEqual(DEFAULT_ACTIONS_COLUMN_WIDTH);
    });

    test('returns the default actions column width + checkbox width when isEventViewer is false and showCheckboxes is true', () => {
      expect(getActionsColumnWidth(false, true)).toEqual(
        DEFAULT_ACTIONS_COLUMN_WIDTH + SHOW_CHECK_BOXES_COLUMN_WIDTH
      );
    });

    test('returns the events viewer actions column width when isEventViewer is true', () => {
      expect(getActionsColumnWidth(true)).toEqual(EVENTS_VIEWER_ACTIONS_COLUMN_WIDTH);
    });

    test('returns the events viewer actions column width + checkbox width when isEventViewer is true and showCheckboxes is true', () => {
      expect(getActionsColumnWidth(true, true)).toEqual(
        EVENTS_VIEWER_ACTIONS_COLUMN_WIDTH + SHOW_CHECK_BOXES_COLUMN_WIDTH
      );
    });
  });
});
