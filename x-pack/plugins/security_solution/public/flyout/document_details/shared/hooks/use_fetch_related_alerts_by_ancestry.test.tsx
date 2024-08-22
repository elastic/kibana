/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react-hooks';
import { renderHook } from '@testing-library/react-hooks';
import type {
  UseFetchRelatedAlertsByAncestryParams,
  UseFetchRelatedAlertsByAncestryResult,
} from './use_fetch_related_alerts_by_ancestry';
import { useFetchRelatedAlertsByAncestry } from './use_fetch_related_alerts_by_ancestry';
import { useAlertPrevalenceFromProcessTree } from './use_alert_prevalence_from_process_tree';

jest.mock('./use_alert_prevalence_from_process_tree');

const documentId = 'documentId';
const indices = ['index1'];
const scopeId = 'scopeId';

describe('useFetchRelatedAlertsByAncestry', () => {
  let hookResult: RenderHookResult<
    UseFetchRelatedAlertsByAncestryParams,
    UseFetchRelatedAlertsByAncestryResult
  >;

  it('should return loading true while data is loading', () => {
    (useAlertPrevalenceFromProcessTree as jest.Mock).mockReturnValue({
      loading: true,
      error: false,
      alertIds: [],
    });

    hookResult = renderHook(() =>
      useFetchRelatedAlertsByAncestry({ documentId, indices, scopeId })
    );

    expect(hookResult.result.current.loading).toEqual(true);
    expect(hookResult.result.current.error).toEqual(false);
    expect(hookResult.result.current.data).toEqual([]);
    expect(hookResult.result.current.dataCount).toEqual(0);
  });

  it('should return error true if data fetching has errored out', () => {
    (useAlertPrevalenceFromProcessTree as jest.Mock).mockReturnValue({
      loading: false,
      error: true,
      alertIds: [],
    });

    hookResult = renderHook(() =>
      useFetchRelatedAlertsByAncestry({ documentId, indices, scopeId })
    );

    expect(hookResult.result.current.loading).toEqual(false);
    expect(hookResult.result.current.error).toEqual(true);
    expect(hookResult.result.current.data).toEqual([]);
    expect(hookResult.result.current.dataCount).toEqual(0);
  });

  it('should return data and count when data fetching is successful', () => {
    (useAlertPrevalenceFromProcessTree as jest.Mock).mockReturnValue({
      loading: false,
      error: false,
      alertIds: ['1', '2'],
    });

    hookResult = renderHook(() =>
      useFetchRelatedAlertsByAncestry({ documentId, indices, scopeId })
    );

    expect(hookResult.result.current.loading).toEqual(false);
    expect(hookResult.result.current.error).toEqual(false);
    expect(hookResult.result.current.data).toEqual(['1', '2']);
    expect(hookResult.result.current.dataCount).toEqual(2);
  });
});
