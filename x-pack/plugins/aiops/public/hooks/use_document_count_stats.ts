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
import { stringHash } from '@kbn/ml-string-hash';
import { createRandomSamplerWrapper } from '@kbn/ml-random-sampler-utils';
import { extractErrorProperties } from '@kbn/ml-error-utils';
import { RANDOM_SAMPLER_SEED } from '@kbn/aiops-log-rate-analysis/constants';
import type { DocumentCountStats } from '@kbn/aiops-log-rate-analysis/types';

import type { DocumentStatsSearchStrategyParams } from '../get_document_stats';
import { getDocumentCountStatsRequest, processDocumentCountStats } from '../get_document_stats';

import { useAiopsAppContext } from './use_aiops_app_context';

export interface DocumentStats {
  sampleProbability: number;
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
  lastRefresh: number,
  changePointsByDefault = true
): DocumentStats {
  const {
    data,
    notifications: { toasts },
  } = useAiopsAppContext();

  const abortCtrl = useRef(new AbortController());

  const [documentStats, setDocumentStats] = useState<DocumentStats>({
    sampleProbability: 1,
    totalCount: 0,
  });

  const [documentStatsCache, setDocumentStatsCache] = useState<Record<string, DocumentStats>>({});

  const cacheKey = stringHash(
    `${JSON.stringify(searchParams)}_${JSON.stringify(searchParamsCompare)}`
  );

  const fetchDocumentCountData = useCallback(async () => {
    if (!searchParams) return;

    if (documentStatsCache[cacheKey]) {
      setDocumentStats(documentStatsCache[cacheKey]);
      return;
    }

    try {
      abortCtrl.current = new AbortController();

      const totalHitsParams = {
        ...searchParams,
        selectedSignificantItem: undefined,
        trackTotalHits: true,
      };

      const totalHitsResp = await lastValueFrom(
        data.search.search(
          {
            params: getDocumentCountStatsRequest(totalHitsParams, undefined, changePointsByDefault),
          },
          { abortSignal: abortCtrl.current.signal }
        )
      );
      const totalHitsStats = processDocumentCountStats(totalHitsResp?.rawResponse, searchParams);
      const totalCount = totalHitsStats?.totalCount ?? 0;

      const randomSamplerWrapper = createRandomSamplerWrapper({
        totalNumDocs: totalCount,
        seed: RANDOM_SAMPLER_SEED,
      });

      const resp = await lastValueFrom(
        data.search.search(
          {
            params: getDocumentCountStatsRequest(
              { ...searchParams, trackTotalHits: false },
              randomSamplerWrapper,
              false,
              searchParamsCompare === undefined && changePointsByDefault
            ),
          },
          { abortSignal: abortCtrl.current.signal }
        )
      );

      const documentCountStats = processDocumentCountStats(
        resp?.rawResponse,
        searchParams,
        randomSamplerWrapper
      );

      const newStats: DocumentStats = {
        sampleProbability: randomSamplerWrapper.probability,
        documentCountStats,
        totalCount,
      };

      if (searchParamsCompare) {
        const respCompare = await lastValueFrom(
          data.search.search(
            {
              params: getDocumentCountStatsRequest(
                { ...searchParamsCompare, trackTotalHits: false },
                randomSamplerWrapper
              ),
            },
            { abortSignal: abortCtrl.current.signal }
          )
        );

        const documentCountStatsCompare = processDocumentCountStats(
          respCompare?.rawResponse,
          searchParamsCompare,
          randomSamplerWrapper
        );

        newStats.documentCountStatsCompare = documentCountStatsCompare;
        newStats.totalCount = totalCount;
      }

      setDocumentStats(newStats);
      setDocumentStatsCache({
        ...documentStatsCache,
        [cacheKey]: newStats,
      });
    } catch (error) {
      // An `AbortError` gets triggered when a user cancels a request by navigating away, we need to ignore these errors.
      if (error.name !== 'AbortError') {
        displayError(toasts, searchParams!.index, extractErrorProperties(error));
      }
    }
    // custom comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.search, documentStatsCache, cacheKey]);

  useEffect(
    function getDocumentCountData() {
      fetchDocumentCountData();
      return () => abortCtrl.current.abort();
    },
    [fetchDocumentCountData, lastRefresh]
  );

  // Clear the document count stats cache when the outer page (date picker/search bar) triggers a refresh.
  useEffect(() => {
    setDocumentStatsCache({});
  }, [lastRefresh]);

  return documentStats;
}
