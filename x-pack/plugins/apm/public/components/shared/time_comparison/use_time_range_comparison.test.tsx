/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { useTimeRangeComparison } from './use_time_range_comparison';
import { EuiThemeProvider } from 'src/plugins/kibana_react/common';

function Wrapper({ children }: { children: React.ReactElement }) {
  return <EuiThemeProvider>{children}</EuiThemeProvider>;
}

describe('useTimeRangeComparison', () => {
  describe('return empty object', () => {
    it('when comparisonType is not defined', () => {
      const start = '2021-01-28T14:45:00.000Z';
      const end = '2021-01-28T15:00:00.000Z';
      const { result } = renderHook(
        () =>
          useTimeRangeComparison({
            start,
            end,
            comparisonType: undefined,
          }),
        { wrapper: Wrapper }
      );
      expect(result.current).toEqual({});
    });

    it('when start is not defined', () => {
      const end = '2021-01-28T15:00:00.000Z';
      const { result } = renderHook(
        () =>
          useTimeRangeComparison({
            start: undefined,
            end,
            comparisonType: 'yesterday',
          }),
        { wrapper: Wrapper }
      );
      expect(result.current).toEqual({});
    });

    it('when end is not defined', () => {
      const start = '2021-01-28T14:45:00.000Z';
      const { result } = renderHook(
        () =>
          useTimeRangeComparison({
            start,
            end: undefined,
            comparisonType: 'yesterday',
          }),
        { wrapper: Wrapper }
      );
      expect(result.current).toEqual({});
    });

    it('when invalid type is provided', () => {
      const start = '2021-01-28T14:45:00.000Z';
      const end = '2021-01-28T15:00:00.000Z';
      const { result } = renderHook(
        () =>
          useTimeRangeComparison({
            start,
            end,
            comparisonType: 'foo',
          }),
        { wrapper: Wrapper }
      );
      expect(result.current).toEqual({});
    });
  });

  describe('Time range is between 0 - 24 hours', () => {
    describe('when yesterday is selected', () => {
      it('returns the correct time range - 15 min', () => {
        const start = '2021-01-28T14:45:00.000Z';
        const end = '2021-01-28T15:00:00.000Z';
        const {
          result: { current },
        } = renderHook(
          () =>
            useTimeRangeComparison({
              comparisonType: 'yesterday',
              start,
              end,
            }),
          { wrapper: Wrapper }
        );
        expect(current.comparisonStart).toEqual('2021-01-27T14:45:00.000Z');
        expect(current.comparisonEnd).toEqual('2021-01-27T15:00:00.000Z');
      });
    });
    describe('when a week ago is selected', () => {
      it('returns the correct time range - 15 min', () => {
        const start = '2021-01-28T14:45:00.000Z';
        const end = '2021-01-28T15:00:00.000Z';
        const {
          result: { current },
        } = renderHook(
          () =>
            useTimeRangeComparison({
              comparisonType: 'week',
              start,
              end,
            }),
          { wrapper: Wrapper }
        );
        expect(current.comparisonStart).toEqual('2021-01-21T14:45:00.000Z');
        expect(current.comparisonEnd).toEqual('2021-01-21T15:00:00.000Z');
      });
    });
  });

  describe('Time range is between 24 hours - 1 week', () => {
    describe('when a week ago is selected', () => {
      it('returns the correct time range - 2 days', () => {
        const start = '2021-01-26T15:00:00.000Z';
        const end = '2021-01-28T15:00:00.000Z';
        const {
          result: { current },
        } = renderHook(
          () =>
            useTimeRangeComparison({
              comparisonType: 'week',
              start,
              end,
            }),
          { wrapper: Wrapper }
        );
        expect(current.comparisonStart).toEqual('2021-01-19T15:00:00.000Z');
        expect(current.comparisonEnd).toEqual('2021-01-21T15:00:00.000Z');
      });
    });
  });

  describe('Time range is greater than 7 days', () => {
    it('uses the date difference to calculate the time range - 8 days', () => {
      const start = '2021-01-10T15:00:00.000Z';
      const end = '2021-01-18T15:00:00.000Z';
      const {
        result: { current },
      } = renderHook(
        () =>
          useTimeRangeComparison({
            comparisonType: 'previousPeriod',
            start,
            end,
          }),
        { wrapper: Wrapper }
      );
      expect(current.comparisonStart).toEqual('2021-01-02T15:00:00.000Z');
      expect(current.comparisonEnd).toEqual('2021-01-10T15:00:00.000Z');
    });

    it('uses the date difference to calculate the time range - 30 days', () => {
      const start = '2021-01-01T15:00:00.000Z';
      const end = '2021-01-31T15:00:00.000Z';
      const {
        result: { current },
      } = renderHook(
        () =>
          useTimeRangeComparison({
            comparisonType: 'previousPeriod',
            start,
            end,
          }),
        { wrapper: Wrapper }
      );
      expect(current.comparisonStart).toEqual('2020-12-02T15:00:00.000Z');
      expect(current.comparisonEnd).toEqual('2021-01-01T15:00:00.000Z');
    });
  });
});
