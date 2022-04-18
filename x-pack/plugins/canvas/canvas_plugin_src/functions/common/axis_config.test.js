/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { functionWrapper } from '@kbn/presentation-util-plugin/common/lib';
import { getFunctionErrors } from '../../../i18n';
import { testTable } from './__fixtures__/test_tables';
import { axisConfig } from './axisConfig';

const errors = getFunctionErrors().axisConfig;

describe('axisConfig', () => {
  const fn = functionWrapper(axisConfig);

  it('returns an axisConfig', () => {
    const result = fn(testTable, { show: true, position: 'right' });
    expect(result).toHaveProperty('type', 'axisConfig');
  });

  describe('args', () => {
    describe('show', () => {
      it('hides labels', () => {
        const result = fn(testTable, { show: false });
        expect(result).toHaveProperty('show', false);
      });

      it('shows labels', () => {
        const result = fn(testTable, { show: true });
        expect(result).toHaveProperty('show', true);
      });

      it('defaults to true', () => {
        const result = fn(testTable);
        expect(result).toHaveProperty('show', true);
      });
    });

    describe('position', () => {
      it('sets the position of the axis labels', () => {
        let result = fn(testTable, { position: 'left' });
        expect(result).toHaveProperty('position', 'left');

        result = fn(testTable, { position: 'top' });
        expect(result).toHaveProperty('position', 'top');

        result = fn(testTable, { position: 'right' });
        expect(result).toHaveProperty('position', 'right');

        result = fn(testTable, { position: 'bottom' });
        expect(result).toHaveProperty('position', 'bottom');
      });

      it('defaults to "left" if not provided', () => {
        const result = fn(testTable);
        expect(result).toHaveProperty('position', 'left');
      });

      it('throws when given an invalid position', () => {
        expect(() => {
          fn(testTable, { position: 'foo' });
        }).toThrow(new RegExp(errors.invalidPosition('foo').message));
      });
    });

    describe('min', () => {
      it('sets the minimum value shown of the axis', () => {
        let result = fn(testTable, { min: -100 });
        expect(result).toHaveProperty('min', -100);
        result = fn(testTable, { min: 1010101010101 });
        expect(result).toHaveProperty('min', 1010101010101);
        result = fn(testTable, { min: '2017-09-01T00:00:00Z' });
        expect(result).toHaveProperty('min', 1504224000000);
        result = fn(testTable, { min: '2017-09-01' });
        expect(result).toHaveProperty('min', 1504224000000);
        result = fn(testTable, { min: '1 Sep 2017' });
        expect(result).toHaveProperty('min', 1504224000000);
      });

      it('throws when given an invalid date string', () => {
        expect(() => {
          fn(testTable, { min: 'foo' });
        }).toThrow(new RegExp(errors.invalidMinDateString('foo').message));
      });
    });

    describe('max', () => {
      it('sets the maximum value shown of the axis', () => {
        let result = fn(testTable, { max: 2000 });
        expect(result).toHaveProperty('max', 2000);
        result = fn(testTable, { max: 1234567000000 });
        expect(result).toHaveProperty('max', 1234567000000);
        result = fn(testTable, { max: '2018-10-06T00:00:00Z' });
        expect(result).toHaveProperty('max', 1538784000000);
        result = fn(testTable, { max: '10/06/2018' });
        expect(result).toHaveProperty('max', 1538784000000);
        result = fn(testTable, { max: 'October 6 2018' });
        expect(result).toHaveProperty('max', 1538784000000);
      });

      it('throws when given an invalid date string', () => {
        expect(() => {
          fn(testTable, { max: '20/02/17' });
        }).toThrow(new RegExp(errors.invalidMaxDateString('20/02/17').message));
      });
    });

    describe('tickSize ', () => {
      it('sets the increment size between ticks of the axis', () => {
        const result = fn(testTable, { tickSize: 100 });
        expect(result).toHaveProperty('tickSize', 100);
      });
    });
  });
});
