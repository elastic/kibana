/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { fullDateFormatter } from './dates';
import { EMPTY_VALUE } from '../../../common/constants';

const mockValidStringDate = 'Sat Jan 01 2022 00:00:00 GMT-0600 (Central Standard Time)';
const mockInvalidStringDate = 'invalid date';

describe('dates', () => {
  describe('fullDateFormatter', () => {
    it('should return date string in FULL_DATE format for valid string date', () => {
      expect(fullDateFormatter(mockValidStringDate)).toEqual('January 1st 2022 @ 00:00:00');
    });

    it('should return date string in FULL_DATE format for valid moment date', () => {
      const date = moment(mockValidStringDate);
      expect(fullDateFormatter(date)).toEqual('January 1st 2022 @ 00:00:00');
    });

    it('should return EMPTY_VALUE for invalid string date', () => {
      expect(fullDateFormatter(mockInvalidStringDate)).toEqual(EMPTY_VALUE);
    });

    it('should return EMPTY_VALUE for invalid moment date', () => {
      const date = moment(mockInvalidStringDate);
      expect(fullDateFormatter(date)).toEqual(EMPTY_VALUE);
    });
  });
});
