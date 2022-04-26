/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { functionWrapper } from '@kbn/presentation-util-plugin/common/lib';
import { getFunctionErrors } from '../../../i18n';
import { emptyFilter } from './__fixtures__/test_filters';
import { timefilter } from './timefilter';

const errors = getFunctionErrors().timefilter;

let clock = null;

beforeEach(async function () {
  clock = sinon.useFakeTimers();
});

afterEach(function () {
  clock.restore();
});

describe('timefilter', () => {
  const fn = functionWrapper(timefilter);
  const fromDate = '2018-02-06T15:00:00.950Z';
  const toDate = '2018-02-07T15:00:00.950Z';

  it('returns a filter', () => {
    expect(
      fn(emptyFilter, {
        column: 'time',
        from: fromDate,
        to: toDate,
      })
    ).toHaveProperty('type', 'filter');
  });

  it("adds a time object to 'and'", () => {
    expect(
      fn(emptyFilter, {
        column: 'time',
        from: fromDate,
        to: toDate,
      }).and[0]
    ).toHaveProperty('filterType', 'time');
  });

  describe('args', () => {
    it("returns the original context if neither 'from' nor 'to' is provided", () => {
      expect(fn(emptyFilter, { column: 'time' })).toEqual(emptyFilter);
    });

    describe('column', () => {
      it('sets the column to apply the filter to', () => {
        expect(fn(emptyFilter, { column: 'time', from: 'now' }).and[0]).toHaveProperty(
          'column',
          'time'
        );
      });

      it("defaults column to '@timestamp'", () => {
        expect(fn(emptyFilter, { from: 'now' }).and[0]).toHaveProperty('column', '@timestamp');
      });
    });

    describe('from', () => {
      it('sets the start date', () => {
        let result = fn(emptyFilter, { from: fromDate });
        expect(result.and[0]).toHaveProperty('from', fromDate);

        result = fn(emptyFilter, { from: 'now-5d' });
        const dateOffset = 24 * 60 * 60 * 1000 * 5; //5 days
        expect(result.and[0]).toHaveProperty(
          'from',
          new Date(new Date().getTime() - dateOffset).toISOString()
        );
      });
    });

    describe('to', () => {
      it('sets the end date', () => {
        let result = fn(emptyFilter, { to: toDate });
        expect(result.and[0]).toHaveProperty('to', toDate);

        result = fn(emptyFilter, { to: 'now' });
        expect(result.and[0]).toHaveProperty('to', new Date().toISOString());
      });

      it('throws when provided an invalid date string', () => {
        expect(() => fn(emptyFilter, { from: '2018-13-42T15:00:00.950Z' })).toThrow(
          new RegExp(errors.invalidString('2018-13-42T15:00:00.950Z').message)
        );
      });
    });
  });
});
