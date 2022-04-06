/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { noop } from 'lodash/fp';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { parseScheduleDates } from '@kbn/securitysolution-io-ts-utils';
import * as i18n from '../translations';
import { useKibana } from '../../../common/lib/kibana';
import {
  isCompleteResponse,
  isErrorResponse,
  isPartialResponse,
  EqlSearchStrategyRequest,
  EqlSearchStrategyResponse,
  EQL_SEARCH_STRATEGY,
} from '../../../../../../../src/plugins/data/common';
import { AbortError } from '../../../../../../../src/plugins/kibana_utils/common';
import { formatInspect, getEqlAggsData } from './helpers';
import { EqlPreviewResponse, EqlPreviewRequest, Source } from './types';
import { hasEqlSequenceQuery } from '../../../../common/detection_engine/utils';
import { EqlSearchResponse } from '../../../../common/detection_engine/types';
import { inputsModel } from '../../../common/store';
import { useAppToasts } from '../use_app_toasts';

export const useEqlPreview = (): [
  boolean,
  (arg: EqlPreviewRequest) => void,
  EqlPreviewResponse
] => {
  const { data } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const unsubscribeStream = useRef(new Subject());
  const [loading, setLoading] = useState(false);
  const didCancel = useRef(false);
  const { addError, addWarning } = useAppToasts();

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
        addWarning(i18n.EQL_TIME_INTERVAL_NOT_DEFINED);
        return;
      }

      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);
        setResponse((prevResponse) => ({
          ...prevResponse,
          data: [],
          inspect: {
            dsl: [],
            response: [],
          },
          totalCount: 0,
        }));

        data.search
          .search<EqlSearchStrategyRequest, EqlSearchStrategyResponse<EqlSearchResponse<Source>>>(
            {
              params: {
                index: index.join(),
                body: {
                  filter: {
                    range: {
                      '@timestamp': {
                        gte: from,
                        lte: to,
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
          .pipe(takeUntil(unsubscribeStream.current))
          .subscribe({
            next: (res) => {
              if (isCompleteResponse(res)) {
                if (!didCancel.current) {
                  setLoading(false);

                  setResponse((prev) => {
                    const { inspect, ...rest } = getEqlAggsData(
                      res,
                      interval,
                      to,
                      refetch.current,
                      index,
                      hasEqlSequenceQuery(query)
                    );
                    const inspectDsl = prev.inspect.dsl[0] ? prev.inspect.dsl : inspect.dsl;
                    const inspectResp = prev.inspect.response[0]
                      ? prev.inspect.response
                      : inspect.response;

                    return {
                      ...prev,
                      ...rest,
                      inspect: {
                        dsl: inspectDsl,
                        response: inspectResp,
                      },
                    };
                  });
                }

                unsubscribeStream.current.next();
              } else if (isPartialResponse(res)) {
                // TODO: Eql search strategy partial responses return a value under meta.params.body
                // but the final/complete response does not, that's why the inspect values are set here
                setResponse((prev) => ({ ...prev, inspect: formatInspect(res, index) }));
              } else if (isErrorResponse(res)) {
                setLoading(false);
                addWarning(i18n.EQL_PREVIEW_FETCH_FAILURE);
                unsubscribeStream.current.next();
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
                addError(err, {
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
    [data.search, addError, addWarning]
  );

  useEffect((): (() => void) => {
    return (): void => {
      didCancel.current = true;
      abortCtrl.current.abort();
      // eslint-disable-next-line react-hooks/exhaustive-deps
      unsubscribeStream.current.complete();
    };
  }, []);

  return [loading, searchEql, response];
};
