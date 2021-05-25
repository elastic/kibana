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
  describe('getDateRange', () => {
    describe('with non-rounded dates', () => {
      describe('one minute', () => {
        it('rounds the start value to minute', () => {
          expect(
            helpers.getDateRange({
              state: {},
              rangeFrom: '2021-01-28T05:47:52.134Z',
              rangeTo: '2021-01-28T05:48:55.304Z',
            })
          ).toEqual({
            start: '2021-01-28T05:47:00.000Z',
            end: '2021-01-28T05:48:55.304Z',
          });
        });
      });
      describe('one day', () => {
        it('rounds the start value to minute', () => {
          expect(
            helpers.getDateRange({
              state: {},
              rangeFrom: '2021-01-27T05:46:07.377Z',
              rangeTo: '2021-01-28T05:46:13.367Z',
            })
          ).toEqual({
            start: '2021-01-27T05:46:00.000Z',
            end: '2021-01-28T05:46:13.367Z',
          });
        });
      });

      describe('one year', () => {
        it('rounds the start value to minute', () => {
          expect(
            helpers.getDateRange({
              state: {},
              rangeFrom: '2020-01-28T05:52:36.290Z',
              rangeTo: '2021-01-28T05:52:39.741Z',
            })
          ).toEqual({
            start: '2020-01-28T05:52:00.000Z',
            end: '2021-01-28T05:52:39.741Z',
          });
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
