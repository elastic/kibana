/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { combineLatest, of, Subscription } from 'rxjs';
import { mergeMap, switchMap } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';
import { ToastsStart } from 'kibana/public';
import { OverallStatsSearchStrategyParams } from '../../../../common/search_strategy/types';
import { useDataVisualizerKibana } from '../../kibana_context';
import {
  checkAggregatableFieldsExistRequest,
  checkNonAggregatableFieldExistsRequest,
  processAggregatableFieldsExistResponse,
  processNonAggregatableFieldsExistResponse,
} from '../search_strategy/requests/overall_stats';
import {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
} from '../../../../../../../src/plugins/data/common';
import { OverallStats } from '../types/overall_stats';
import { getDefaultPageState } from '../components/index_data_visualizer_view/index_data_visualizer_view';
import { extractErrorProperties } from '../utils/error_utils';

function displayError(toastNotifications: ToastsStart, indexPattern: string, err: any) {
  if (err.statusCode === 500) {
    toastNotifications.addError(err, {
      title: i18n.translate('xpack.dataVisualizer.index.dataLoader.internalServerErrorMessage', {
        defaultMessage:
          'Error loading data in index {index}. {message}. ' +
          'The request may have timed out. Try using a smaller sample size or narrowing the time range.',
        values: {
          index: indexPattern,
          message: err.error ?? err.message,
        },
      }),
    });
  } else {
    toastNotifications.addError(err, {
      title: i18n.translate('xpack.dataVisualizer.index.errorLoadingDataMessage', {
        defaultMessage: 'Error loading data in index {index}. {message}.',
        values: {
          index: indexPattern,
          message: err.error ?? err.message,
        },
      }),
    });
  }
}

export function useOverallStats<TParams extends OverallStatsSearchStrategyParams>(
  searchStrategyParams: TParams | undefined
): OverallStats {
  const {
    services: {
      data,
      notifications: { toasts },
    },
  } = useDataVisualizerKibana();

  const [stats, setOverallStats] = useState<OverallStats>(getDefaultPageState().overallStats);

  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef<Subscription>();

  const startFetch = useCallback(() => {
    searchSubscription$.current?.unsubscribe();
    abortCtrl.current.abort();
    abortCtrl.current = new AbortController();
    if (!searchStrategyParams) return;

    const {
      aggregatableFields,
      nonAggregatableFields,
      index,
      searchQuery,
      timeFieldName,
      earliest,
      latest,
      runtimeFieldMap,
      samplerShardSize,
    } = searchStrategyParams;

    const nonAggregatableOverallStats$ =
      nonAggregatableFields.length > 0
        ? combineLatest(
            nonAggregatableFields.map((fieldName: string) =>
              data.search
                .search<IKibanaSearchRequest, IKibanaSearchResponse>(
                  {
                    params: checkNonAggregatableFieldExistsRequest(
                      index,
                      searchQuery,
                      fieldName,
                      timeFieldName,
                      earliest,
                      latest,
                      runtimeFieldMap
                    ),
                  },
                  {
                    abortSignal: abortCtrl.current.signal,
                    sessionId: searchStrategyParams?.sessionId,
                  }
                )
                .pipe(
                  switchMap((resp) => {
                    return of({
                      ...resp,
                      rawResponse: { ...resp.rawResponse, fieldName },
                    } as IKibanaSearchResponse);
                  })
                )
            )
          )
        : of(undefined);

    const aggregatableOverallStats$ =
      aggregatableFields.length > 0
        ? data.search.search(
            {
              params: checkAggregatableFieldsExistRequest(
                index,
                searchQuery,
                aggregatableFields,
                samplerShardSize,
                timeFieldName,
                earliest,
                latest,
                undefined,
                runtimeFieldMap
              ),
            },
            {
              abortSignal: abortCtrl.current.signal,
              sessionId: searchStrategyParams?.sessionId,
            }
          )
        : of(undefined);

    const sub = combineLatest([nonAggregatableOverallStats$, aggregatableOverallStats$]).pipe(
      mergeMap(([nonAggregatableOverallStatsResp, aggregatableOverallStatsResp]) => {
        const aggregatableOverallStats = processAggregatableFieldsExistResponse(
          aggregatableOverallStatsResp?.rawResponse,
          aggregatableFields,
          samplerShardSize
        );
        const nonAggregatableOverallStats = processNonAggregatableFieldsExistResponse(
          nonAggregatableOverallStatsResp,
          nonAggregatableFields
        );
        return of({
          ...nonAggregatableOverallStats,
          ...aggregatableOverallStats,
        });
      })
    );

    searchSubscription$.current = sub.subscribe({
      next: (overallStats) => {
        if (overallStats) {
          setOverallStats(overallStats);
        }
      },
      error: (error) => {
        displayError(toasts, searchStrategyParams.index, extractErrorProperties(error));
      },
    });
  }, [data.search, searchStrategyParams, toasts]);

  const cancelFetch = useCallback(() => {
    searchSubscription$.current?.unsubscribe();
    searchSubscription$.current = undefined;
    abortCtrl.current.abort();
  }, []);

  // auto-update
  useEffect(() => {
    startFetch();
    return cancelFetch;
  }, [startFetch, cancelFetch]);

  return useMemo(() => stats, [stats]);
}
