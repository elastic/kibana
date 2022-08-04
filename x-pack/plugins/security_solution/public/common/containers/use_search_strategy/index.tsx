/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { filter } from 'rxjs/operators';
import { noop, omit } from 'lodash/fp';
import { useCallback, useEffect, useRef, useMemo } from 'react';
import type { Observable } from 'rxjs';
import { useObservable } from '@kbn/securitysolution-hook-utils';
import { isCompleteResponse, isErrorResponse } from '@kbn/data-plugin/public';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import type { Transaction } from '@elastic/apm-rum';
import * as i18n from './translations';

import type {
  FactoryQueryTypes,
  StrategyRequestType,
  StrategyResponseType,
} from '../../../../common/search_strategy/security_solution';
import { getInspectResponse } from '../../../helpers';
import type { inputsModel } from '../../store';
import { useKibana } from '../../lib/kibana';
import { useAppToasts } from '../../hooks/use_app_toasts';
import { useStartTransaction } from '../../lib/apm/use_start_transaction';
import type { SearchStrategyMonitoringKey } from '../../lib/apm/http_requests';

interface UseSearchFunctionParams<QueryType extends FactoryQueryTypes> {
  request: StrategyRequestType<QueryType>;
  signal: AbortSignal;
}

type UseSearchFunction<QueryType extends FactoryQueryTypes> = (
  params: UseSearchFunctionParams<QueryType>
) => Observable<StrategyResponseType<QueryType>>;

type SearchFunction<QueryType extends FactoryQueryTypes> = (
  params: StrategyRequestType<QueryType>
) => void;

const EMPTY_INSPECT = {
  dsl: [],
  response: [],
};

const useSearch = <QueryType extends FactoryQueryTypes>(
  factoryQueryType: QueryType,
  monitoringKey?: SearchStrategyMonitoringKey
): UseSearchFunction<QueryType> => {
  const { data } = useKibana().services;
  const { startTransaction } = useStartTransaction();

  const search = useCallback<UseSearchFunction<QueryType>>(
    ({ signal, request }) => {
      let transaction: Transaction | undefined;
      if (monitoringKey) {
        transaction = startTransaction({ name: monitoringKey, type: 'http-request' });
      }

      const observable = data.search
        .search<StrategyRequestType<QueryType>, StrategyResponseType<QueryType>>(
          { ...request, factoryQueryType },
          {
            strategy: 'securitySolutionSearchStrategy',
            abortSignal: signal,
          }
        )
        .pipe(filter((response) => isErrorResponse(response) || isCompleteResponse(response)));

      if (monitoringKey) {
        observable.subscribe({
          next: () => {
            if (transaction) {
              transaction.addLabels({ result: 'success' });
              transaction.end();
            }
          },
          error: () => {
            if (transaction) {
              transaction.addLabels({ result: signal.aborted ? 'aborted' : 'error' });
              transaction.end();
            }
          },
        });
      }

      return observable;
    },
    [data.search, factoryQueryType, monitoringKey, startTransaction]
  );

  return search;
};

export const useSearchStrategy = <QueryType extends FactoryQueryTypes>({
  factoryQueryType,
  initialResult,
  errorMessage,
  monitoringKey,
  abort = false,
}: {
  factoryQueryType: QueryType;
  /**
   * `result` initial value. It is used until the search strategy returns some data.
   */
  initialResult: Omit<StrategyResponseType<QueryType>, 'rawResponse'>;
  /**
   * Message displayed to the user on a Toast when an error happens.
   */
  errorMessage?: string;
  /**
   * Monitoring Key to track the request performance using APM
   */
  monitoringKey?: SearchStrategyMonitoringKey;
  /**
   * When the flag switches from `false` to `true`, it will abort any ongoing request.
   */
  abort?: boolean;
}) => {
  const abortCtrl = useRef(new AbortController());
  const refetch = useRef<inputsModel.Refetch>(noop);
  const { addError } = useAppToasts();

  const search = useSearch(factoryQueryType, monitoringKey);

  const { start, error, result, loading } = useObservable<
    [UseSearchFunctionParams<QueryType>],
    StrategyResponseType<QueryType>
  >(search);

  useEffect(() => {
    if (error != null && !(error instanceof AbortError)) {
      addError(error, {
        title: errorMessage ?? i18n.DEFAULT_ERROR_SEARCH_STRATEGY(factoryQueryType),
      });
    }
  }, [addError, error, errorMessage, factoryQueryType]);

  const searchCb = useCallback<SearchFunction<QueryType>>(
    (request) => {
      const startSearch = () => {
        abortCtrl.current = new AbortController();
        start({
          request,
          signal: abortCtrl.current.signal,
        });
      };

      abortCtrl.current.abort();
      startSearch();

      refetch.current = startSearch;
    },
    [start]
  );

  useEffect(() => {
    return () => {
      abortCtrl.current.abort();
    };
  }, []);

  useEffect(() => {
    if (abort) {
      abortCtrl.current.abort();
    }
  }, [abort]);

  const [formatedResult, inspect] = useMemo(
    () => [
      result
        ? omit<StrategyResponseType<QueryType>, 'rawResponse'>('rawResponse', result)
        : initialResult,
      result ? getInspectResponse(result, EMPTY_INSPECT) : EMPTY_INSPECT,
    ],
    [result, initialResult]
  );

  return {
    loading,
    result: formatedResult,
    error,
    search: searchCb,
    refetch: refetch.current,
    inspect,
  };
};
