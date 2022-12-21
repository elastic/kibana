/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@kbn/datemath';
import moment from 'moment-timezone';
import * as helpers from './helpers';

describe('url_params_context helpers', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
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

    describe('when rangeFrom or rangeTo are falsy', () => {
      it('returns the previous state', () => {
        // Disable console warning about not receiving a valid date for rangeFrom
        jest.spyOn(console, 'warn').mockImplementationOnce(() => {});

        expect(
          helpers.getDateRange({
            state: {
              start: '1972-01-01T00:00:00.000Z',
              end: '1973-01-01T00:00:00.000Z',
            },
            rangeFrom: '',
            rangeTo: 'now',
          })
        ).toEqual({
          start: '1972-01-01T00:00:00.000Z',
          end: '1973-01-01T00:00:00.000Z',
        });
      });
    });

    describe('when the start or end are invalid', () => {
      it('returns the previous state', () => {
        const endDate = moment('2021-06-04T18:03:24.211Z');
        jest
          .spyOn(datemath, 'parse')
          .mockReturnValueOnce(undefined)
          .mockReturnValueOnce(endDate);

        expect(
          helpers.getDateRange({
            state: {
              start: '1972-01-01T00:00:00.000Z',
              end: '1973-01-01T00:00:00.000Z',
            },
            rangeFrom: 'nope',
            rangeTo: 'now',
          })
        ).toEqual({
          start: '1972-01-01T00:00:00.000Z',
          end: '1973-01-01T00:00:00.000Z',
        });
      });
    });

    describe('when rangeFrom or rangeTo have changed', () => {
      it('returns new state', () => {
        jest.spyOn(Date, 'now').mockReturnValue(moment(0).unix());

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
          start: '1969-12-31T23:58:00.000Z',
          end: '1970-01-01T00:00:00.000Z',
        });
      });
    });
  });
});
