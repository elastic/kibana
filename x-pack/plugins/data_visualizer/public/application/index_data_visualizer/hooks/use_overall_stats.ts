/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { combineLatest, forkJoin, of, Subscription } from 'rxjs';
import { mergeMap, switchMap } from 'rxjs/operators';
import {
  FieldStatsSearchStrategyParams,
  OverallStatsSearchStrategyParams,
} from '../../../../common/search_strategy/types';
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

export function useOverallStats<TParams extends OverallStatsSearchStrategyParams>(
  searchStrategyParams: TParams | undefined
): OverallStats {
  const {
    services: { data },
  } = useDataVisualizerKibana();

  const [stats, setOverallStats] = useState<OverallStats>(getDefaultPageState().overallStats);

  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef<Subscription>();

  const startFetch = useCallback(() => {
    searchSubscription$.current?.unsubscribe();
    abortCtrl.current.abort();
    abortCtrl.current = new AbortController();
    if (!searchStrategyParams) return;
    console.log('searchStrategyParams', searchStrategyParams);

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

    const nonAggregatableOverallStats$ = combineLatest(
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
    );
    const sub = forkJoin({
      nonAggregatableOverallStatsResp: nonAggregatableOverallStats$,
      aggregatableOverallStatsResp: data.search.search(
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
      ),
    }).pipe(
      mergeMap(({ nonAggregatableOverallStatsResp, aggregatableOverallStatsResp }) => {
        const aggregatableOverallStats = processAggregatableFieldsExistResponse(
          aggregatableOverallStatsResp.rawResponse,
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
        setOverallStats(overallStats);
      },
      error: (error) => {
        // @todo: handle error
        // import { extractErrorProperties } from '../utils/error_utils';
      },
    });
  }, [data.search, searchStrategyParams]);

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
