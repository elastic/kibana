/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { Location } from 'history';
import qs from 'query-string';
import { useDateRangeRedirect } from './use_date_range_redirect';

const mockReplace = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({ replace: mockReplace }),
  useLocation: jest.fn(),
}));

const mockIsInactiveHistoryError = jest.fn();

jest.mock('../components/shared/links/url_helpers', () => ({
  isInactiveHistoryError: (...args: unknown[]) => mockIsInactiveHistoryError(...args),
}));

jest.mock('../context/apm_plugin/use_apm_plugin_context', () => ({
  useApmPluginContext: () => ({
    core: {
      uiSettings: {
        get: () => ({ from: 'now-15m', to: 'now' }),
      },
    },
    plugins: {
      data: {
        query: {
          timefilter: {
            timefilter: {
              getTime: () => ({ from: 'now-15m', to: 'now' }),
            },
          },
        },
      },
    },
  }),
}));

const { useLocation } = jest.requireMock('react-router-dom') as {
  useLocation: jest.Mock;
};

const setLocation = (search: string) => {
  useLocation.mockReturnValue({
    pathname: '/services',
    search,
    hash: '',
    state: undefined,
  } as Location);
};

const getReplacedSearch = (): qs.ParsedQuery<string> => {
  const call = mockReplace.mock.calls[0][0];
  return qs.parse(call.search);
};

describe('useDateRangeRedirect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsInactiveHistoryError.mockReturnValue(false);
  });

  describe('when both rangeFrom and rangeTo are valid', () => {
    it('returns isDateRangeSet as true', () => {
      setLocation('?rangeFrom=now-15m&rangeTo=now');

      const { result } = renderHook(() => useDateRangeRedirect());

      expect(result.current.isDateRangeSet).toBe(true);
    });
  });

  describe('when rangeFrom is missing', () => {
    it('returns isDateRangeSet as false and redirect fills the default rangeFrom', () => {
      setLocation('?rangeTo=now%2B30m&otherParam=foo');

      const { result } = renderHook(() => useDateRangeRedirect());

      expect(result.current.isDateRangeSet).toBe(false);

      result.current.redirect();

      const search = getReplacedSearch();
      expect(search.rangeFrom).toBe('now-15m');
      expect(search.rangeTo).toBe('now+30m');
      expect(search.otherParam).toBe('foo');
    });
  });

  describe('when rangeTo is missing', () => {
    it('returns isDateRangeSet as false and redirect fills the default rangeTo', () => {
      setLocation('?rangeFrom=now-30m&otherParam=foo');

      const { result } = renderHook(() => useDateRangeRedirect());

      expect(result.current.isDateRangeSet).toBe(false);

      result.current.redirect();

      const search = getReplacedSearch();
      expect(search.rangeFrom).toBe('now-30m');
      expect(search.rangeTo).toBe('now');
      expect(search.otherParam).toBe('foo');
    });
  });

  describe('when both rangeFrom and rangeTo are missing', () => {
    it('returns isDateRangeSet as false and redirect fills both defaults', () => {
      setLocation('?otherParam=foo');

      const { result } = renderHook(() => useDateRangeRedirect());

      expect(result.current.isDateRangeSet).toBe(false);

      result.current.redirect();

      const search = getReplacedSearch();
      expect(search.rangeFrom).toBe('now-15m');
      expect(search.rangeTo).toBe('now');
      expect(search.otherParam).toBe('foo');
    });
  });

  describe('when rangeFrom is invalid', () => {
    it('returns isDateRangeSet as false and redirect replaces rangeFrom with default', () => {
      setLocation('?rangeFrom=invalid_date&rangeTo=now%2B30m');

      const { result } = renderHook(() => useDateRangeRedirect());

      expect(result.current.isDateRangeSet).toBe(false);

      result.current.redirect();

      const search = getReplacedSearch();
      expect(search.rangeFrom).toBe('now-15m');
      expect(search.rangeTo).toBe('now+30m');
    });
  });

  describe('when rangeTo is invalid', () => {
    it('returns isDateRangeSet as false and redirect replaces rangeTo with default', () => {
      setLocation('?rangeFrom=now-30m&rangeTo=invalid_date');

      const { result } = renderHook(() => useDateRangeRedirect());

      expect(result.current.isDateRangeSet).toBe(false);

      result.current.redirect();

      const search = getReplacedSearch();
      expect(search.rangeFrom).toBe('now-30m');
      expect(search.rangeTo).toBe('now');
    });
  });

  describe('when both rangeFrom and rangeTo are invalid', () => {
    it('returns isDateRangeSet as false and redirect replaces both with defaults', () => {
      setLocation('?rangeFrom=invalid&rangeTo=invalid&otherParam=foo');

      const { result } = renderHook(() => useDateRangeRedirect());

      expect(result.current.isDateRangeSet).toBe(false);

      result.current.redirect();

      const search = getReplacedSearch();
      expect(search.rangeFrom).toBe('now-15m');
      expect(search.rangeTo).toBe('now');
      expect(search.otherParam).toBe('foo');
    });
  });

  describe('error handling', () => {
    it('swallows inactive history errors', () => {
      setLocation('?otherParam=foo');
      mockReplace.mockImplementation(() => {
        throw new Error('fell out of navigation scope');
      });
      mockIsInactiveHistoryError.mockReturnValue(true);

      const { result } = renderHook(() => useDateRangeRedirect());

      expect(() => result.current.redirect()).not.toThrow();
    });

    it('re-throws non-inactive history errors', () => {
      setLocation('?otherParam=foo');
      mockReplace.mockImplementation(() => {
        throw new Error('Some other error');
      });
      mockIsInactiveHistoryError.mockReturnValue(false);

      const { result } = renderHook(() => useDateRangeRedirect());

      expect(() => result.current.redirect()).toThrow('Some other error');
    });
  });
});
