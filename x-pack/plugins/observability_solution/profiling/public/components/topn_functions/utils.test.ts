/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { TopNFunctions } from '@kbn/profiling-utils';
import { getColorLabel, getTotalCount } from './utils';

describe('Top N functions: Utils', () => {
  describe('getColorLabel', () => {
    it('returns correct value when percentage is lower than 0', () => {
      expect(getColorLabel(-10)).toEqual({
        color: 'success',
        label: '10.00%',
        icon: 'sortUp',
      });
    });

    it('returns correct value when percentage is 0', () => {
      expect(getColorLabel(0)).toEqual({
        color: 'text',
        label: '0%',
        icon: undefined,
      });
    });

    it('returns correct value when percentage is greater than  0', () => {
      expect(getColorLabel(10)).toEqual({
        color: 'danger',
        label: '10.00%',
        icon: 'sortDown',
      });
    });

    it('returns correct value when percentage is Infinity', () => {
      expect(getColorLabel(Infinity)).toEqual({
        color: 'text',
        label: undefined,
        icon: undefined,
      });
    });
  });
  describe('getTotalCount', () => {
    it('returns default value', () => {
      expect(getTotalCount()).toEqual(0);
    });
    it('returns value from topNFunctions', () => {
      expect(getTotalCount({ selfCPU: 10 } as TopNFunctions)).toEqual(10);
    });
  });
});
