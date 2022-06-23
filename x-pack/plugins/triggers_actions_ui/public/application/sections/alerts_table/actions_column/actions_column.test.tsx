/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ActionButtonIcon } from '../../../../types';
import {
  getActionsColumnWidth,
  MIN_ACTION_COLUMN_HEADER_WIDTH,
  getActionButtonCount,
} from './actions_column';

describe('actions column', () => {
  describe('getActionsColumnWidth', () => {
    it('should return the header with in case the width of all actions are not longer', () => {
      expect(getActionsColumnWidth(1)).toEqual(MIN_ACTION_COLUMN_HEADER_WIDTH);
    });

    it('should return the actions row width in case its greater than the header width', () => {
      expect(getActionsColumnWidth(4)).toBeGreaterThan(MIN_ACTION_COLUMN_HEADER_WIDTH);
    });
  });

  describe('getActionButtonCount', () => {
    it('should return the right number of actions', () => {
      const emptyActions = undefined;
      const nonEmptyActions: ActionButtonIcon[] = [
        { iconType: 'analyzeEvent', color: 'primary', onClick: () => {} },
        { iconType: 'invert', color: 'primary', onClick: () => {} },
      ];

      expect(getActionButtonCount(emptyActions, false)).toEqual(0);
      expect(getActionButtonCount(emptyActions, true)).toEqual(1);
      expect(getActionButtonCount(nonEmptyActions, false)).toEqual(2);
      expect(getActionButtonCount(nonEmptyActions, true)).toEqual(3);
    });
  });
});
