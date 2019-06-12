/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { axisConfig } from '../axisConfig';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';
import { getFunctionErrors } from '../../../strings';
import { testTable } from './fixtures/test_tables';

const errors = getFunctionErrors().axisConfig;

describe('axisConfig', () => {
  const fn = functionWrapper(axisConfig);

  it('returns an axisConfig', () => {
    const result = fn(testTable, { show: true, position: 'right' });
    expect(result).to.have.property('type', 'axisConfig');
  });

  describe('args', () => {
    describe('show', () => {
      it('hides labels', () => {
        const result = fn(testTable, { show: false });
        expect(result).to.have.property('show', false);
      });

      it('shows labels', () => {
        const result = fn(testTable, { show: true });
        expect(result).to.have.property('show', true);
      });

      it('defaults to true', () => {
        const result = fn(testTable);
        expect(result).to.have.property('show', true);
      });
    });

    describe('position', () => {
      it('sets the position of the axis labels', () => {
        let result = fn(testTable, { position: 'left' });
        expect(result).to.have.property('position', 'left');

        result = fn(testTable, { position: 'top' });
        expect(result).to.have.property('position', 'top');

        result = fn(testTable, { position: 'right' });
        expect(result).to.have.property('position', 'right');

        result = fn(testTable, { position: 'bottom' });
        expect(result).to.have.property('position', 'bottom');
      });

      it('defaults to "left" if not provided', () => {
        const result = fn(testTable);
        expect(result).to.have.property('position', 'left');
      });

      it('throws when given an invalid position', () => {
        expect(fn)
          .withArgs(testTable, { position: 'foo' })
          .to.throwException(new RegExp(errors.invalidPosition('foo').message));
      });
    });

    describe('min', () => {
      it('sets the minimum value shown of the axis', () => {
        let result = fn(testTable, { min: -100 });
        expect(result).to.have.property('min', -100);
        result = fn(testTable, { min: 1010101010101 });
        expect(result).to.have.property('min', 1010101010101);
        result = fn(testTable, { min: '2017-09-01T00:00:00Z' });
        expect(result).to.have.property('min', 1504224000000);
        result = fn(testTable, { min: '2017-09-01' });
        expect(result).to.have.property('min', 1504224000000);
        result = fn(testTable, { min: '1 Sep 2017' });
        expect(result).to.have.property('min', 1504224000000);
      });

      it('throws when given an invalid date string', () => {
        expect(fn)
          .withArgs(testTable, { min: 'foo' })
          .to.throwException(new RegExp(errors.invalidMinDateString('foo').message));
      });
    });

    describe('max', () => {
      it('sets the maximum value shown of the axis', () => {
        let result = fn(testTable, { max: 2000 });
        expect(result).to.have.property('max', 2000);
        result = fn(testTable, { max: 1234567000000 });
        expect(result).to.have.property('max', 1234567000000);
        result = fn(testTable, { max: '2018-10-06T00:00:00Z' });
        expect(result).to.have.property('max', 1538784000000);
        result = fn(testTable, { max: '10/06/2018' });
        expect(result).to.have.property('max', 1538784000000);
        result = fn(testTable, { max: 'October 6 2018' });
        expect(result).to.have.property('max', 1538784000000);
      });

      it('throws when given an invalid date string', () => {
        expect(fn)
          .withArgs(testTable, { max: '20/02/17' })
          .to.throwException(new RegExp(errors.invalidMaxDateString('20/02/17').message));
      });
    });

    describe('tickSize ', () => {
      it('sets the increment size between ticks of the axis', () => {
        const result = fn(testTable, { tickSize: 100 });
        expect(result).to.have.property('tickSize', 100);
      });
    });
  });
});
