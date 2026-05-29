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
    it('fills default rangeFrom and keeps rangeTo when resolved range is valid', () => {
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
    it('fills default rangeTo and keeps rangeFrom when resolved range is valid', () => {
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
    it('fills default rangeFrom and keeps rangeTo when resolved range is valid', () => {
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
    it('fills default rangeTo and keeps rangeFrom when resolved range is valid', () => {
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

  describe('when rangeFrom resolves to after rangeTo (inverted range)', () => {
    it('returns isDateRangeSet as false and redirect replaces both with defaults', () => {
      setLocation('?rangeFrom=now-11m&rangeTo=2020-01-01T00:00:00.000Z');

      const { result } = renderHook(() => useDateRangeRedirect());

      expect(result.current.isDateRangeSet).toBe(false);

      result.current.redirect();

      const search = getReplacedSearch();
      expect(search.rangeFrom).toBe('now-15m');
      expect(search.rangeTo).toBe('now');
    });

    it('replaces both dates even when both are individually valid', () => {
      setLocation('?rangeFrom=now&rangeTo=now-1h');

      const { result } = renderHook(() => useDateRangeRedirect());

      expect(result.current.isDateRangeSet).toBe(false);

      result.current.redirect();

      const search = getReplacedSearch();
      expect(search.rangeFrom).toBe('now-15m');
      expect(search.rangeTo).toBe('now');
    });
  });

  describe('when filling a default still produces a valid range', () => {
    it('keeps rangeTo and fills default rangeFrom when rangeFrom is missing', () => {
      setLocation('?rangeTo=now-5m');

      const { result } = renderHook(() => useDateRangeRedirect());

      result.current.redirect();

      const search = getReplacedSearch();
      expect(search.rangeFrom).toBe('now-15m');
      expect(search.rangeTo).toBe('now-5m');
    });

    it('keeps rangeFrom and fills default rangeTo when rangeTo is missing', () => {
      setLocation('?rangeFrom=now-1h');

      const { result } = renderHook(() => useDateRangeRedirect());

      result.current.redirect();

      const search = getReplacedSearch();
      expect(search.rangeFrom).toBe('now-1h');
      expect(search.rangeTo).toBe('now');
    });

    it('keeps rangeTo and fills default rangeFrom when rangeFrom is invalid', () => {
      setLocation('?rangeFrom=not-a-date&rangeTo=now-2m');

      const { result } = renderHook(() => useDateRangeRedirect());

      result.current.redirect();

      const search = getReplacedSearch();
      expect(search.rangeFrom).toBe('now-15m');
      expect(search.rangeTo).toBe('now-2m');
    });

    it('keeps rangeFrom and fills default rangeTo when rangeTo is invalid', () => {
      setLocation('?rangeFrom=now-3h&rangeTo=banana');

      const { result } = renderHook(() => useDateRangeRedirect());

      result.current.redirect();

      const search = getReplacedSearch();
      expect(search.rangeFrom).toBe('now-3h');
      expect(search.rangeTo).toBe('now');
    });
  });

  describe('when filling a default still produces an invalid range', () => {
    it('resets both when rangeFrom is missing and rangeTo is before the default rangeFrom', () => {
      setLocation('?rangeTo=now-20m');

      const { result } = renderHook(() => useDateRangeRedirect());

      result.current.redirect();

      const search = getReplacedSearch();
      expect(search.rangeFrom).toBe('now-15m');
      expect(search.rangeTo).toBe('now');
    });

    it('resets both when rangeFrom is invalid and rangeTo is before the default rangeFrom', () => {
      setLocation('?rangeFrom=garbage&rangeTo=now-20m');

      const { result } = renderHook(() => useDateRangeRedirect());

      result.current.redirect();

      const search = getReplacedSearch();
      expect(search.rangeFrom).toBe('now-15m');
      expect(search.rangeTo).toBe('now');
    });

    it('resets both when rangeFrom is invalid and rangeTo is between default from and default to', () => {
      setLocation('?rangeFrom=garbage&rangeTo=now-10m');

      const { result } = renderHook(() => useDateRangeRedirect());

      result.current.redirect();

      const search = getReplacedSearch();
      expect(search.rangeFrom).toBe('now-15m');
      expect(search.rangeTo).toBe('now-10m');
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
