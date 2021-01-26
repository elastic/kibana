/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import datemath from '@elastic/datemath';
import moment from 'moment-timezone';
import * as helpers from './helpers';

describe('url_params_context helpers', () => {
  describe('getDateRange', () => {
    describe('with non-rounded dates', () => {
      it('rounds the lower value', () => {
        expect(
          helpers.getDateRange({
            state: {},
            rangeFrom: '1970-01-05T01:22:33.234Z',
            rangeTo: '1971-01-10T10:11:12.123Z',
          })
        ).toEqual({
          start: '1970-01-01T00:00:00.000Z',
          end: '1971-01-10T10:11:12.123Z',
        });
      });
    });

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
