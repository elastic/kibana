/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react-hooks';
import { renderHook } from '@testing-library/react-hooks';
import { ALERT_PREVALENCE_AGG, useAlertPrevalence } from './use_alert_prevalence';
import type { UseAlertPrevalenceParams, UserAlertPrevalenceResult } from './use_alert_prevalence';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { useQueryAlerts } from '../../../../detections/containers/detection_engine/alerts/use_query';

jest.mock('../../../../common/containers/use_global_time');
jest.mock('../../../../common/hooks/use_selector');
jest.mock('../../../../detections/containers/detection_engine/alerts/use_query');

describe('useAlertPrevalence', () => {
  let hookResult: RenderHookResult<UseAlertPrevalenceParams, UserAlertPrevalenceResult>;

  beforeEach(() => {
    (useDeepEqualSelector as jest.Mock).mockReturnValue({
      from: 'from',
      to: 'to',
    });
    (useGlobalTime as jest.Mock).mockReturnValue({
      from: 'from',
      to: 'to',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return all properties', () => {
    (useQueryAlerts as jest.Mock).mockReturnValue({
      loading: true,
      data: undefined,
      setQuery: jest.fn(),
    });

    hookResult = renderHook(() =>
      useAlertPrevalence({
        field: 'field',
        value: 'value',
        indexName: 'index',
        isActiveTimelines: true,
        includeAlertIds: false,
        ignoreTimerange: false,
      })
    );

    expect(hookResult.result.current.loading).toEqual(true);
    expect(hookResult.result.current.error).toEqual(false);
    expect(hookResult.result.current.alertIds).toEqual(undefined);
    expect(hookResult.result.current.count).toEqual(undefined);
  });

  it('should return error true if loading is done and no data', () => {
    (useQueryAlerts as jest.Mock).mockReturnValue({
      loading: false,
      data: undefined,
      setQuery: jest.fn(),
    });

    hookResult = renderHook(() =>
      useAlertPrevalence({
        field: 'field',
        value: 'value',
        indexName: 'index',
        isActiveTimelines: true,
        includeAlertIds: false,
        ignoreTimerange: false,
      })
    );

    expect(hookResult.result.current.loading).toEqual(false);
    expect(hookResult.result.current.error).toEqual(true);
    expect(hookResult.result.current.alertIds).toEqual(undefined);
    expect(hookResult.result.current.count).toEqual(undefined);
  });

  it('should return correct count from aggregation', () => {
    (useQueryAlerts as jest.Mock).mockReturnValue({
      loading: false,
      data: {
        aggregations: {
          [ALERT_PREVALENCE_AGG]: {
            buckets: [{ doc_count: 1 }],
          },
        },
        hits: {
          hits: [],
        },
      },
      setQuery: jest.fn(),
    });

    hookResult = renderHook(() =>
      useAlertPrevalence({
        field: 'field',
        value: 'value',
        indexName: 'index',
        isActiveTimelines: true,
        includeAlertIds: false,
        ignoreTimerange: false,
      })
    );

    expect(hookResult.result.current.loading).toEqual(false);
    expect(hookResult.result.current.error).toEqual(false);
    expect(hookResult.result.current.alertIds).toEqual([]);
    expect(hookResult.result.current.count).toEqual(1);
  });

  it('should return alertIds if includeAlertIds is true', () => {
    (useQueryAlerts as jest.Mock).mockReturnValue({
      loading: false,
      data: {
        aggregations: {
          [ALERT_PREVALENCE_AGG]: {
            buckets: [{ doc_count: 1 }],
          },
        },
        hits: {
          hits: [{ _id: 'id' }],
        },
      },
      setQuery: jest.fn(),
    });

    hookResult = renderHook(() =>
      useAlertPrevalence({
        field: 'field',
        value: 'value',
        indexName: 'index',
        isActiveTimelines: true,
        includeAlertIds: true,
        ignoreTimerange: false,
      })
    );

    expect(hookResult.result.current.loading).toEqual(false);
    expect(hookResult.result.current.error).toEqual(false);
    expect(hookResult.result.current.alertIds).toEqual(['id']);
    expect(hookResult.result.current.count).toEqual(1);
  });
});
