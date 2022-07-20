/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState, useMemo } from 'react';
import { lastValueFrom } from 'rxjs';
import { i18n } from '@kbn/i18n';
import type { ToastsStart } from '@kbn/core/public';
import { useAiOpsKibana } from '../kibana_context';
import { extractErrorProperties } from '../application/utils/error_utils';
import {
  DocumentCountStats,
  getDocumentCountStatsRequest,
  processDocumentCountStats,
  DocumentStatsSearchStrategyParams,
} from '../get_document_stats';

export interface DocumentStats {
  totalCount: number;
  documentCountStats?: DocumentCountStats;
}

function displayError(toastNotifications: ToastsStart, index: string, err: any) {
  if (err.statusCode === 500) {
    toastNotifications.addError(err, {
      title: i18n.translate('xpack.aiops.index.dataLoader.internalServerErrorMessage', {
        defaultMessage:
          'Error loading data in index {index}. {message}. ' +
          'The request may have timed out. Try using a smaller sample size or narrowing the time range.',
        values: {
          index,
          message: err.error ?? err.message,
        },
      }),
    });
  } else {
    toastNotifications.addError(err, {
      title: i18n.translate('xpack.aiops.index.errorLoadingDataMessage', {
        defaultMessage: 'Error loading data in index {index}. {message}.',
        values: {
          index,
          message: err.error ?? err.message,
        },
      }),
    });
  }
}

export function useDocumentCountStats<TParams extends DocumentStatsSearchStrategyParams>(
  searchParams: TParams | undefined,
  lastRefresh: number
): {
  docStats: DocumentStats;
} {
  const {
    services: {
      data,
      notifications: { toasts },
    },
  } = useAiOpsKibana();

  const [stats, setStats] = useState<DocumentStats>({
    totalCount: 0,
  });

  const fetchDocumentCountData = useCallback(async () => {
    if (!searchParams) return;

    try {
      const resp = await lastValueFrom(
        data.search.search({
          params: getDocumentCountStatsRequest(searchParams),
        })
      );
      const documentCountStats = processDocumentCountStats(resp?.rawResponse, searchParams);
      const totalCount = documentCountStats?.totalCount ?? 0;
      setStats({
        documentCountStats,
        totalCount,
      });
    } catch (error) {
      displayError(toasts, searchParams!.index, extractErrorProperties(error));
    }
  }, [data?.search, searchParams, toasts]);

  useEffect(
    function getDocumentCountData() {
      fetchDocumentCountData();
    },
    [fetchDocumentCountData]
  );

  return useMemo(
    () => ({
      docStats: stats,
    }),
    [stats]
  );
}
