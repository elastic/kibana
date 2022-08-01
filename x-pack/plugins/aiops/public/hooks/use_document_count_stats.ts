/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
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
  documentCountStatsCompare?: DocumentCountStats;
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
  searchParamsCompare: TParams | undefined,
  lastRefresh: number
): DocumentStats {
  const {
    services: {
      data,
      notifications: { toasts },
    },
  } = useAiOpsKibana();

  const abortCtrl = useRef(new AbortController());

  const [documentStats, setDocumentStats] = useState<DocumentStats>({
    totalCount: 0,
  });

  const fetchDocumentCountData = useCallback(async () => {
    if (!searchParams) return;

    try {
      abortCtrl.current = new AbortController();

      const resp = await lastValueFrom(
        data.search.search(
          {
            params: getDocumentCountStatsRequest(searchParams),
          },
          { abortSignal: abortCtrl.current.signal }
        )
      );

      const documentCountStats = processDocumentCountStats(resp?.rawResponse, searchParams);
      const totalCount = documentCountStats?.totalCount ?? 0;

      const newStats: DocumentStats = {
        documentCountStats,
        totalCount,
      };

      if (searchParamsCompare) {
        const respCompare = await lastValueFrom(
          data.search.search(
            {
              params: getDocumentCountStatsRequest(searchParamsCompare),
            },
            { abortSignal: abortCtrl.current.signal }
          )
        );

        const documentCountStatsCompare = processDocumentCountStats(
          respCompare?.rawResponse,
          searchParamsCompare
        );
        const totalCountCompare = documentCountStatsCompare?.totalCount ?? 0;

        newStats.documentCountStatsCompare = documentCountStatsCompare;
        newStats.totalCount += totalCountCompare;
      }

      setDocumentStats(newStats);
    } catch (error) {
      // An `AbortError` gets triggered when a user cancels a request by navigating away, we need to ignore these errors.
      if (error.name !== 'AbortError') {
        displayError(toasts, searchParams!.index, extractErrorProperties(error));
      }
    }
  }, [data?.search, searchParams, searchParamsCompare, toasts]);

  useEffect(
    function getDocumentCountData() {
      fetchDocumentCountData();
      return () => abortCtrl.current.abort();
    },
    [fetchDocumentCountData, lastRefresh]
  );

  return documentStats;
}
