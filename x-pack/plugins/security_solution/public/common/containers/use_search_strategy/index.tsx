/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { filter } from 'rxjs';
import { noop, omit } from 'lodash/fp';
import { useCallback, useEffect, useRef, useMemo } from 'react';
import type { Observable } from 'rxjs';
import { useObservable } from '@kbn/securitysolution-hook-utils';
import { isRunningResponse } from '@kbn/data-plugin/public';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import * as i18n from './translations';

import type {
  FactoryQueryTypes,
  StrategyRequestInputType,
  StrategyResponseType,
} from '../../../../common/search_strategy/security_solution';
import { getInspectResponse } from '../../../helpers';
import type { inputsModel } from '../../store';
import { useKibana } from '../../lib/kibana';
import { useAppToasts } from '../../hooks/use_app_toasts';
import { useTrackHttpRequest } from '../../lib/apm/use_track_http_request';
import { APP_UI_ID } from '../../../../common/constants';

interface UseSearchFunctionParams<QueryType extends FactoryQueryTypes> {
  request: Omit<StrategyRequestInputType<QueryType>, 'factoryQueryType'>;
  abortSignal: AbortSignal;
}

type UseSearchFunction<QueryType extends FactoryQueryTypes> = (
  params: UseSearchFunctionParams<QueryType>
) => Observable<StrategyResponseType<QueryType>>;

type SearchFunction<QueryType extends FactoryQueryTypes> = (
  params: Omit<StrategyRequestInputType<QueryType>, 'factoryQueryType'>
) => void;

const EMPTY_INSPECT = {
  dsl: [],
  response: [],
};

export const useSearch = <QueryType extends FactoryQueryTypes>(
  factoryQueryType: QueryType
): UseSearchFunction<QueryType> => {
  const { data } = useKibana().services;
  const { startTracking } = useTrackHttpRequest();

  const search = useCallback<UseSearchFunction<QueryType>>(
    ({ abortSignal, request }) => {
      const { endTracking } = startTracking({
        name: `${APP_UI_ID} searchStrategy ${factoryQueryType}`,
        spanName: 'batched search',
      });

      const observable = data.search
        .search<StrategyRequestInputType<QueryType>, StrategyResponseType<QueryType>>(
          { ...request, factoryQueryType } as StrategyRequestInputType<QueryType>,
          {
            strategy: 'securitySolutionSearchStrategy',
            abortSignal,
          }
        )
        .pipe(filter((response) => !isRunningResponse(response)));

      observable.subscribe({
        next: (response) => {
          endTracking('success');
        },
        error: () => {
          endTracking(abortSignal.aborted ? 'aborted' : 'error');
        },
      });

      return observable;
    },
    [data.search, factoryQueryType, startTracking]
  );

  return search;
};

export const useSearchStrategy = <QueryType extends FactoryQueryTypes>({
  factoryQueryType,
  initialResult,
  errorMessage,
  abort = false,
  showErrorToast = true,
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
   * When the flag switches from `false` to `true`, it will abort any ongoing request.
   */
  abort?: boolean;
  /**
   * Show error toast when error occurs on search complete
   */
  showErrorToast?: boolean;
}) => {
  const abortCtrl = useRef(new AbortController());
  const refetch = useRef<inputsModel.Refetch>(noop);
  const { addError } = useAppToasts();

  const search = useSearch(factoryQueryType);

  const { start, error, result, loading } = useObservable<
    [UseSearchFunctionParams<QueryType>],
    StrategyResponseType<QueryType>
  >(search);

  useEffect(() => {
    if (showErrorToast && error != null && !(error instanceof AbortError)) {
      addError(error, {
        title: errorMessage ?? i18n.DEFAULT_ERROR_SEARCH_STRATEGY(factoryQueryType),
      });
    }
  }, [addError, error, errorMessage, factoryQueryType, showErrorToast]);

  const searchCb = useCallback<SearchFunction<QueryType>>(
    (request) => {
      const startSearch = () => {
        abortCtrl.current = new AbortController();
        start({
          request,
          abortSignal: abortCtrl.current.signal,
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

  const [formattedResult, inspect] = useMemo(() => {
    if (!result) {
      return [initialResult, EMPTY_INSPECT];
    }
    return [
      omit<StrategyResponseType<QueryType>, 'rawResponse'>('rawResponse', result),
      getInspectResponse(result, EMPTY_INSPECT),
    ];
  }, [result, initialResult]);

  return {
    loading,
    result: formattedResult,
    error,
    search: searchCb,
    refetch: refetch.current,
    inspect,
  };
};
