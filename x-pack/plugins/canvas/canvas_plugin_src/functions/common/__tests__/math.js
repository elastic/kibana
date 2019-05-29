/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { math } from '../math';
import { functionWrapper } from '../../../../__tests__/helpers/function_wrapper';
import { getFunctionErrors } from '../../../strings';
import { emptyTable, testTable } from './fixtures/test_tables';

const errors = getFunctionErrors().math;

describe('math', () => {
  const fn = functionWrapper(math);

  it('evaluates math expressions without reference to context', () => {
    expect(fn(null, { expression: '10.5345' })).to.be(10.5345);
    expect(fn(null, { expression: '123 + 456' })).to.be(579);
    expect(fn(null, { expression: '100 - 46' })).to.be(54);
    expect(fn(1, { expression: '100 / 5' })).to.be(20);
    expect(fn('foo', { expression: '100 / 5' })).to.be(20);
    expect(fn(true, { expression: '100 / 5' })).to.be(20);
    expect(fn(testTable, { expression: '100 * 5' })).to.be(500);
    expect(fn(emptyTable, { expression: '100 * 5' })).to.be(500);
  });

  it('evaluates math expressions with reference to the value of the context, must be a number', () => {
    expect(fn(-103, { expression: 'abs(value)' })).to.be(103);
  });

  it('evaluates math expressions with references to columns in a datatable', () => {
    expect(fn(testTable, { expression: 'unique(in_stock)' })).to.be(2);
    expect(fn(testTable, { expression: 'sum(quantity)' })).to.be(2508);
    expect(fn(testTable, { expression: 'mean(price)' })).to.be(320);
    expect(fn(testTable, { expression: 'min(price)' })).to.be(67);
    expect(fn(testTable, { expression: 'median(quantity)' })).to.be(256);
    expect(fn(testTable, { expression: 'max(price)' })).to.be(605);
  });

  describe('args', () => {
    describe('expression', () => {
      it('sets the math expression to be evaluted', () => {
        expect(fn(null, { expression: '10' })).to.be(10);
        expect(fn(23.23, { expression: 'floor(value)' })).to.be(23);
        expect(fn(testTable, { expression: 'count(price)' })).to.be(9);
        expect(fn(testTable, { expression: 'count(name)' })).to.be(9);
      });
    });
  });

  describe('invalid expressions', () => {
    it('throws when expression evaluates to an array', () => {
      expect(fn)
        .withArgs(testTable, { expression: 'multiply(price, 2)' })
        .to.throwException(new RegExp(errors.tooManyResults().message.replace(/[()]/g, '\\$&')));
    });

    it('throws when using an unknown context variable', () => {
      expect(fn)
        .withArgs(testTable, { expression: 'sum(foo)' })
        .to.throwException(e => {
          expect(e.message).to.be('Unknown variable: foo');
        });
    });

    it('throws when using non-numeric data', () => {
      expect(fn)
        .withArgs(testTable, { expression: 'mean(name)' })
        .to.throwException(new RegExp(errors.executionFailed().message));
      expect(fn)
        .withArgs(testTable, { expression: 'mean(in_stock)' })
        .to.throwException(new RegExp(errors.executionFailed().message));
    });

    it('throws when missing expression', () => {
      expect(fn)
        .withArgs(testTable)
        .to.throwException(new RegExp(errors.emptyExpression().message));
      expect(fn)
        .withArgs(testTable, { expression: '' })
        .to.throwException(new RegExp(errors.emptyExpression().message));
      expect(fn)
        .withArgs(testTable, { expression: ' ' })
        .to.throwException(new RegExp(errors.emptyExpression().message));
    });

    it('throws when passing a context variable from an empty datatable', () => {
      expect(fn)
        .withArgs(emptyTable, { expression: 'mean(foo)' })
        .to.throwException(new RegExp(errors.emptyDatatable().message));
    });
  });
});
