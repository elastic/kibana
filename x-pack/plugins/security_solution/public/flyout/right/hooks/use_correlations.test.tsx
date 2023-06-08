/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react-hooks';
import { renderHook } from '@testing-library/react-hooks';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { useShowRelatedCases } from './use_show_related_cases';
import { useFetchRelatedCases } from './use_fetch_related_cases';
import { useShowRelatedAlertsByAncestry } from './use_show_related_alerts_by_ancestry';
import { useFetchRelatedAlertsByAncestry } from './use_fetch_related_alerts_by_ancestry';
import { useShowRelatedAlertsBySameSourceEvent } from './use_show_related_alerts_by_same_source_event';
import { useFetchRelatedAlertsBySameSourceEvent } from './use_fetch_related_alerts_by_same_source_event';
import { useShowRelatedAlertsBySession } from './use_show_related_alerts_by_session';
import { useFetchRelatedAlertsBySession } from './use_fetch_related_alerts_by_session';
import type { UseCorrelationsParams, UseCorrelationsResult } from './use_correlations';
import { useCorrelations } from './use_correlations';
import { mockDataAsNestedObject, mockDataFormattedForFieldBrowser } from '../mocks/mock_context';

jest.mock('./use_show_related_cases');
jest.mock('./use_fetch_related_cases');
jest.mock('./use_show_related_alerts_by_ancestry');
jest.mock('./use_fetch_related_alerts_by_ancestry');
jest.mock('./use_show_related_alerts_by_same_source_event');
jest.mock('./use_fetch_related_alerts_by_same_source_event');
jest.mock('./use_show_related_alerts_by_session');
jest.mock('./use_fetch_related_alerts_by_session');

const eventId = 'eventId';
const dataAsNestedObject = mockDataAsNestedObject as unknown as Ecs;
const dataFormattedForFieldBrowser = mockDataFormattedForFieldBrowser;
const scopeId = 'scopeId';

const mockShowHooks = ({
  cases = true,
  ancestry = true,
  sameSource = true,
  session = true,
}: {
  cases?: boolean;
  ancestry?: boolean;
  sameSource?: boolean;
  session?: boolean;
}) => {
  (useShowRelatedCases as jest.Mock).mockReturnValue(cases);
  (useShowRelatedAlertsByAncestry as jest.Mock).mockReturnValue(ancestry);
  (useShowRelatedAlertsBySameSourceEvent as jest.Mock).mockReturnValue(sameSource);
  (useShowRelatedAlertsBySession as jest.Mock).mockReturnValue(session);
};

const mockFetchLoadingReturnValue = {
  loading: true,
  error: false,
  dataCount: 0,
};

const mockFetchErrorReturnValue = {
  loading: false,
  error: true,
  dataCount: 0,
};

const mockFetchReturnValue = {
  loading: false,
  error: false,
  dataCount: 1,
};

const mockFetchHooks = ({
  cases = mockFetchReturnValue,
  ancestry = mockFetchReturnValue,
  sameSource = mockFetchReturnValue,
  session = mockFetchReturnValue,
}: {
  cases?: typeof mockFetchReturnValue;
  ancestry?: typeof mockFetchReturnValue;
  sameSource?: typeof mockFetchReturnValue;
  session?: typeof mockFetchReturnValue;
}) => {
  (useFetchRelatedCases as jest.Mock).mockReturnValue(cases);
  (useFetchRelatedAlertsByAncestry as jest.Mock).mockReturnValue(ancestry);
  (useFetchRelatedAlertsBySameSourceEvent as jest.Mock).mockReturnValue(sameSource);
  (useFetchRelatedAlertsBySession as jest.Mock).mockReturnValue(session);
};

describe('useCorrelations', () => {
  let hookResult: RenderHookResult<UseCorrelationsParams, UseCorrelationsResult>;

  it(`should return loading true if casesLoading is true`, () => {
    mockShowHooks({});
    mockFetchHooks({ cases: mockFetchLoadingReturnValue });

    hookResult = renderHook(() =>
      useCorrelations({ eventId, dataAsNestedObject, dataFormattedForFieldBrowser, scopeId })
    );

    expect(hookResult.result.current.loading).toEqual(true);
    expect(hookResult.result.current.dataCount).toEqual(3);
  });

  it(`should return loading true if ancestryAlertsLoading is true`, () => {
    mockShowHooks({});
    mockFetchHooks({ ancestry: mockFetchLoadingReturnValue });

    hookResult = renderHook(() =>
      useCorrelations({ eventId, dataAsNestedObject, dataFormattedForFieldBrowser, scopeId })
    );

    expect(hookResult.result.current.loading).toEqual(true);
    expect(hookResult.result.current.dataCount).toEqual(3);
  });

  it(`should return loading true if sameSourceAlertsLoading is true`, () => {
    mockShowHooks({});
    mockFetchHooks({ sameSource: mockFetchLoadingReturnValue });

    hookResult = renderHook(() =>
      useCorrelations({ eventId, dataAsNestedObject, dataFormattedForFieldBrowser, scopeId })
    );

    expect(hookResult.result.current.loading).toEqual(true);
    expect(hookResult.result.current.dataCount).toEqual(3);
  });

  it(`should return loading true if alertsBySessionLoading is true`, () => {
    mockShowHooks({});
    mockFetchHooks({ session: mockFetchLoadingReturnValue });

    hookResult = renderHook(() =>
      useCorrelations({ eventId, dataAsNestedObject, dataFormattedForFieldBrowser, scopeId })
    );

    expect(hookResult.result.current.loading).toEqual(true);
    expect(hookResult.result.current.dataCount).toEqual(3);
  });

  it(`should return dataCount 3 if casesError is true`, () => {
    mockShowHooks({});
    mockFetchHooks({ cases: mockFetchErrorReturnValue });

    hookResult = renderHook(() =>
      useCorrelations({ eventId, dataAsNestedObject, dataFormattedForFieldBrowser, scopeId })
    );

    expect(hookResult.result.current.dataCount).toEqual(3);
  });

  it(`should return dataCount 3 if ancestryAlertsError is true`, () => {
    mockShowHooks({});
    mockFetchHooks({ ancestry: mockFetchErrorReturnValue });

    hookResult = renderHook(() =>
      useCorrelations({ eventId, dataAsNestedObject, dataFormattedForFieldBrowser, scopeId })
    );

    expect(hookResult.result.current.dataCount).toEqual(3);
  });

  it(`should return dataCount 3 if sameSourceAlertsError is true`, () => {
    mockShowHooks({});
    mockFetchHooks({ sameSource: mockFetchErrorReturnValue });

    hookResult = renderHook(() =>
      useCorrelations({ eventId, dataAsNestedObject, dataFormattedForFieldBrowser, scopeId })
    );

    expect(hookResult.result.current.dataCount).toEqual(3);
  });

  it(`should return dataCount 3 if alertsBySessionError is true`, () => {
    mockShowHooks({});
    mockFetchHooks({ session: mockFetchErrorReturnValue });

    hookResult = renderHook(() =>
      useCorrelations({ eventId, dataAsNestedObject, dataFormattedForFieldBrowser, scopeId })
    );

    expect(hookResult.result.current.dataCount).toEqual(3);
  });

  it(`should return error true if all errors are true`, () => {
    mockShowHooks({});
    mockFetchHooks({
      cases: mockFetchErrorReturnValue,
      ancestry: mockFetchErrorReturnValue,
      sameSource: mockFetchErrorReturnValue,
      session: mockFetchErrorReturnValue,
    });

    hookResult = renderHook(() =>
      useCorrelations({ eventId, dataAsNestedObject, dataFormattedForFieldBrowser, scopeId })
    );

    expect(hookResult.result.current.error).toEqual(true);
    expect(hookResult.result.current.dataCount).toEqual(0);
  });

  it(`should return dataCount 0 if all loading are true`, () => {
    mockShowHooks({});
    mockFetchHooks({
      cases: mockFetchLoadingReturnValue,
      ancestry: mockFetchLoadingReturnValue,
      sameSource: mockFetchLoadingReturnValue,
      session: mockFetchLoadingReturnValue,
    });

    hookResult = renderHook(() =>
      useCorrelations({ eventId, dataAsNestedObject, dataFormattedForFieldBrowser, scopeId })
    );

    expect(hookResult.result.current.loading).toEqual(true);
    expect(hookResult.result.current.dataCount).toEqual(0);
  });
});
