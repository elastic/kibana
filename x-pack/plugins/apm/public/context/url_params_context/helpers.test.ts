/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import moment from 'moment-timezone';
import * as helpers from './helpers';

describe('url_params_context helpers', () => {
  describe('getParsedDate', () => {
    describe('given undefined', () => {
      it('returns undefined', () => {
        expect(helpers.getParsedDate(undefined)).toBeUndefined();
      });
    });

    describe('given a parsable date', () => {
      it('returns the parsed date', () => {
        expect(helpers.getParsedDate('1970-01-01T00:00:00.000Z')).toEqual(
          '1970-01-01T00:00:00.000Z'
        );
      });
    });

    describe('given a non-parsable date', () => {
      it('returns null', () => {
        expect(helpers.getParsedDate('nope')).toEqual(null);
      });
    });
  });

  describe('getDateRange', () => {
    describe('when rangeFrom and rangeTo are not changed', () => {
      it('returns the previous state', () => {
        expect(
          helpers.getDateRange({
            state: {
              rangeFrom: 'now-1m',
              rangeTo: 'now',
              start: '1970-01-01T00:00:00.000Z',
              end: '1971-01-01T00:00:00.000Z',
            },
            rangeFrom: 'now-1m',
            rangeTo: 'now',
          })
        ).toEqual({
          start: '1970-01-01T00:00:00.000Z',
          end: '1971-01-01T00:00:00.000Z',
        });
      });
    });

    describe('when rangeFrom or rangeTo have changed', () => {
      it('returns new state', () => {
        jest.spyOn(datemath, 'parse').mockReturnValue(moment(0).utc());

        expect(
          helpers.getDateRange({
            state: {
              rangeFrom: 'now-1m',
              rangeTo: 'now',
              start: '1972-01-01T00:00:00.000Z',
              end: '1973-01-01T00:00:00.000Z',
            },
            rangeFrom: 'now-2m',
            rangeTo: 'now',
          })
        ).toEqual({
          start: '1970-01-01T00:00:00.000Z',
          end: '1970-01-01T00:00:00.000Z',
        });
      });
    });
  });
});
