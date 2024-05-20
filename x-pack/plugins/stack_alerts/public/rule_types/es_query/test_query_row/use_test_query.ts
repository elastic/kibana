/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import type { ParsedAggregationResults } from '@kbn/triggers-actions-ui-plugin/common';
import { EuiDataGridColumn } from '@elastic/eui';

interface TestQueryResponse {
  result: string | null;
  error: string | null;
  isLoading: boolean;
  rawResults: { cols: EuiDataGridColumn[]; rows: Array<Record<string, string | null>> } | null;
  alerts: string[] | null;
}

const TEST_QUERY_INITIAL_RESPONSE: TestQueryResponse = {
  result: null,
  error: null,
  isLoading: false,
  rawResults: null,
  alerts: null,
};

/**
 * Hook used to test the data fetching execution by returning a number of found documents
 * Or in error in case it's failing
 */
export function useTestQuery(
  fetch: () => Promise<{
    testResults: ParsedAggregationResults;
    isGrouped: boolean;
    timeWindow: string;
    rawResults?: { cols: EuiDataGridColumn[]; rows: Array<Record<string, string | null>> };
  }>
) {
  const [testQueryResponse, setTestQueryResponse] = useState<TestQueryResponse>(
    TEST_QUERY_INITIAL_RESPONSE
  );

  // Reset query response when criteria got changed
  useEffect(() => {
    setTestQueryResponse(TEST_QUERY_INITIAL_RESPONSE);
  }, [fetch]);

  const onTestQuery = useCallback(async () => {
    setTestQueryResponse({
      result: null,
      error: null,
      isLoading: true,
      rawResults: null,
      alerts: null,
    });

    try {
      const { testResults, isGrouped, timeWindow, rawResults } = await fetch();

      if (isGrouped) {
        setTestQueryResponse({
          result: i18n.translate('xpack.stackAlerts.esQuery.ui.testQueryGroupedResponse', {
            defaultMessage: 'Grouped query matched {groups} groups in the last {window}.',
            values: {
              groups: testResults.results.length,
              window: timeWindow,
            },
          }),
          error: null,
          isLoading: false,
          rawResults: rawResults ?? null,
          alerts:
            testResults.results.length > 0
              ? testResults.results.map((result) => result.group)
              : null,
        });
      } else {
        const ungroupedQueryResponse =
          testResults.results.length > 0 ? testResults.results[0] : { count: 0 };
        setTestQueryResponse({
          result: i18n.translate('xpack.stackAlerts.esQuery.ui.numQueryMatchesText', {
            defaultMessage: 'Query matched {count} documents in the last {window}.',
            values: { count: ungroupedQueryResponse?.count ?? 0, window: timeWindow },
          }),
          error: null,
          isLoading: false,
          rawResults: rawResults ?? null,
          alerts: ungroupedQueryResponse.count > 0 ? ['query matched'] : null,
        });
      }
    } catch (err) {
      const message = err?.body?.attributes?.error?.root_cause[0]?.reason || err?.body?.message;

      setTestQueryResponse({
        result: null,
        error: i18n.translate('xpack.stackAlerts.esQuery.ui.queryError', {
          defaultMessage: 'Error testing query: {message}',
          values: { message: message ? `${err.message}: ${message}` : err.message },
        }),
        isLoading: false,
        rawResults: null,
        alerts: null,
      });
    }
  }, [fetch]);

  return {
    onTestQuery,
    testQueryResult: testQueryResponse.result,
    testQueryError: testQueryResponse.error,
    testQueryLoading: testQueryResponse.isLoading,
    testQueryRawResults: testQueryResponse.rawResults,
    testQueryAlerts: testQueryResponse.alerts,
  };
}
