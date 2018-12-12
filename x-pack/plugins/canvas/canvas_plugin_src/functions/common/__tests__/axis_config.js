/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { axisConfig } from '../axisConfig';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';
import { testTable } from '../__tests__/fixtures/test_tables';
import { getFunctionErrors } from '../../../errors';

describe('axisConfig', () => {
  const fn = functionWrapper(axisConfig);
  const functionErrors = getFunctionErrors();

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

      it('defaults to an empty string if not provided', () => {
        const result = fn(testTable);
        expect(result).to.have.property('position', '');
      });

      it('throws when given an invalid position', () => {
        expect(fn)
          .withArgs(testTable, { position: 'foo' })
          .to.throwException(e => {
            expect(e.message).to.be(functionErrors.axisConfig.positionInvalid('foo').message);
          });
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

      it('throws when given an invalid min string', () => {
        expect(fn)
          .withArgs(testTable, { min: 'foo' })
          .to.throwException(e => {
            expect(e.message).to.be(functionErrors.axisConfig.minInvalid('foo').message);
          });
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

      it('throws when given an invalid max string', () => {
        expect(fn)
          .withArgs(testTable, { max: 'foo' })
          .to.throwException(e => {
            expect(e.message).to.be(functionErrors.axisConfig.maxInvalid('foo').message);
          });
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
