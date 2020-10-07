/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { noop } from 'lodash/fp';
import { Subscription } from 'rxjs';

import * as i18n from '../translations';
import { useKibana } from '../../../common/lib/kibana';
import {
  AbortError,
  isCompleteResponse,
  isErrorResponse,
} from '../../../../../../../src/plugins/data/common';
import {
  EqlSearchStrategyRequest,
  EqlSearchStrategyResponse,
} from '../../../../../data_enhanced/common';
import { getEqlAggsData, getSequenceAggs } from './helpers';
import { EqlPreviewResponse, EqlPreviewRequest, Source } from './types';
import { hasEqlSequenceQuery } from '../../../../common/detection_engine/utils';
import { EqlSearchResponse } from '../../../../common/detection_engine/types';
import { parseScheduleDates } from '../../../../common/detection_engine/parse_schedule_dates';
import { inputsModel } from '../../../common/store';
import { EQL_SEARCH_STRATEGY } from '../../../../../data_enhanced/public';

export const useEqlPreview = (): [
  boolean,
  (arg: EqlPreviewRequest) => void,
  EqlPreviewResponse
] => {
  const { data, notifications } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const [loading, setLoading] = useState(false);
  const didCancel = useRef(false);

  const [response, setResponse] = useState<EqlPreviewResponse>({
    data: [],
    inspect: {
      dsl: [],
      response: [],
    },
    refetch: refetch.current,
    totalCount: 0,
  });

  const searchEql = useCallback(
    ({ from, to, query, index, interval }: EqlPreviewRequest) => {
      if (parseScheduleDates(to) == null || parseScheduleDates(from) == null) {
        notifications.toasts.addWarning('Time intervals are not defined.');
        return;
      }

      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);
        let searchSubscription$: Subscription | null = null;
        searchSubscription$ = data.search
          .search<EqlSearchStrategyRequest, EqlSearchStrategyResponse<EqlSearchResponse<Source>>>(
            {
              params: {
                // @ts-expect-error allow_no_indices is missing on EqlSearch
                allow_no_indices: true,
                index: index.join(),
                body: {
                  filter: {
                    range: {
                      '@timestamp': {
                        gte: to,
                        lte: from,
                        format: 'strict_date_optional_time',
                      },
                    },
                  },
                  query,
                  // EQL requires a cap, otherwise it defaults to 10
                  // It also sorts on ascending order, capping it at
                  // something smaller like 20, made it so that some of
                  // the more recent events weren't returned
                  size: 100,
                },
              },
            },
            {
              strategy: EQL_SEARCH_STRATEGY,
              abortSignal: abortCtrl.current.signal,
            }
          )
          .subscribe({
            next: (res) => {
              if (isCompleteResponse(res)) {
                if (!didCancel.current) {
                  if (hasEqlSequenceQuery(query)) {
                    setResponse(getSequenceAggs(res, interval, to, from, refetch.current));
                  } else {
                    setResponse(getEqlAggsData(res, interval, to, from, refetch.current));
                  }
                }
              } else if (isErrorResponse(res)) {
                notifications.toasts.addWarning(i18n.EQL_PREVIEW_FETCH_FAILURE);
              }

              if (!didCancel.current) {
                setLoading(false);
                if (searchSubscription$ != null) {
                  searchSubscription$.unsubscribe();
                }
              }
            },
            error: (err) => {
              if (!(err instanceof AbortError)) {
                setLoading(false);
                setResponse({
                  data: [],
                  inspect: {
                    dsl: [],
                    response: [],
                  },
                  refetch: refetch.current,
                  totalCount: 0,
                });
                notifications.toasts.addError(err, {
                  title: i18n.EQL_PREVIEW_FETCH_FAILURE,
                });
              }
            },
          });
      };

      abortCtrl.current.abort();
      asyncSearch();
      refetch.current = asyncSearch;
    },
    [data.search, notifications.toasts]
  );

  useEffect((): (() => void) => {
    return (): void => {
      didCancel.current = true;
    };
  }, []);

  return [loading, searchEql, response];
};
