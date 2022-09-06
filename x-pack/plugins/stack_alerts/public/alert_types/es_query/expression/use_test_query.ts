/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

/**
 * Hook used to test the data fetching execution by returning a number of found documents
 * Or in error in case it's failing
 */
export function useTestQuery(fetch: () => Promise<{ nrOfDocs: number; timeWindow: string }>) {
  const [testQueryResult, setTestQueryResult] = useState<string | null>(null);
  const [testQueryError, setTestQueryError] = useState<string | null>(null);
  const [testQueryLoading, setTestQueryLoading] = useState<boolean>(false);

  const onTestQuery = useCallback(async () => {
    setTestQueryLoading(true);
    setTestQueryError(null);
    setTestQueryResult(null);
    try {
      const { nrOfDocs, timeWindow } = await fetch();

      setTestQueryResult(
        i18n.translate('xpack.stackAlerts.esQuery.ui.numQueryMatchesText', {
          defaultMessage: 'Query matched {count} documents in the last {window}.',
          values: { count: nrOfDocs, window: timeWindow },
        })
      );
    } catch (err) {
      const message = err?.body?.attributes?.error?.root_cause[0]?.reason || err?.body?.message;
      setTestQueryError(
        i18n.translate('xpack.stackAlerts.esQuery.ui.queryError', {
          defaultMessage: 'Error testing query: {message}',
          values: { message: message ? `${err.message}: ${message}` : err.message },
        })
      );
    } finally {
      setTestQueryLoading(false);
    }
  }, [fetch]);

  return {
    onTestQuery,
    testQueryResult,
    testQueryError,
    testQueryLoading,
  };
}

export function totalHitsToNumber(total: estypes.SearchHitsMetadata['total']): number {
  return typeof total === 'number' ? total : total?.value ?? 0;
}
