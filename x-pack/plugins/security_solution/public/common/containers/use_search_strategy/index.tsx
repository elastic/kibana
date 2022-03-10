/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { filter } from 'rxjs/operators';
import { noop, omit } from 'lodash/fp';
import { useCallback, useEffect, useRef, useMemo } from 'react';
import { Observable } from 'rxjs';

import {
  OptionalSignalArgs,
  useObservable,
  withOptionalSignal,
} from '@kbn/securitysolution-hook-utils';

import * as i18n from './translations';

import {
  FactoryQueryTypes,
  RequestBasicOptions,
  StrategyResponseType,
} from '../../../../common/search_strategy/security_solution';
import { IKibanaSearchResponse } from '../../../../../../../src/plugins/data/common';
import {
  DataPublicPluginStart,
  isCompleteResponse,
  isErrorResponse,
} from '../../../../../../../src/plugins/data/public';
import {
  TransformChangesIfTheyExist,
  useTransforms,
} from '../../../transforms/containers/use_transforms';
import { getInspectResponse } from '../../../helpers';
import { inputsModel } from '../../store';
import { useKibana } from '../../lib/kibana';
import { useAppToasts } from '../../hooks/use_app_toasts';

type UseSearchStrategyRequestArgs = RequestBasicOptions & {
  data: DataPublicPluginStart;
  signal: AbortSignal;
  factoryQueryType: FactoryQueryTypes;
  getTransformChangesIfTheyExist: TransformChangesIfTheyExist;
};

const search = <ResponseType extends IKibanaSearchResponse>({
  data,
  signal,
  factoryQueryType,
  defaultIndex,
  filterQuery,
  timerange,
  getTransformChangesIfTheyExist,
  ...requestProps
}: UseSearchStrategyRequestArgs): Observable<ResponseType> => {
  const {
    indices: transformIndices,
    factoryQueryType: transformFactoryQueryType,
    timerange: transformTimerange,
  } = getTransformChangesIfTheyExist({
    factoryQueryType,
    indices: defaultIndex,
    filterQuery,
    timerange,
  });

  return data.search.search<RequestBasicOptions, ResponseType>(
    {
      ...requestProps,
      factoryQueryType: transformFactoryQueryType,
      defaultIndex: transformIndices,
      timerange: transformTimerange,
      filterQuery,
    },
    {
      strategy: 'securitySolutionSearchStrategy',
      abortSignal: signal,
    }
  );
};

const searchComplete = <ResponseType extends IKibanaSearchResponse>(
  props: UseSearchStrategyRequestArgs
): Observable<ResponseType> => {
  return search<ResponseType>(props).pipe(
    filter((response) => {
      return isErrorResponse(response) || isCompleteResponse(response);
    })
  );
};

export const useSearchStrategy = <QueryType extends FactoryQueryTypes>({
  factoryQueryType,
  initialResult,
  errorMessage,
}: {
  factoryQueryType: QueryType;
  /**
   * `result` initial value. It is used until the search strategy returns some data.
   */
  initialResult: Omit<StrategyResponseType<QueryType>, 'rawResponse' | 'inspect'>;
  /**
   * Message displayed to the user on a Toast when an erro happens.
   */
  errorMessage?: string;
}) => {
  const { getTransformChangesIfTheyExist } = useTransforms();

  const refetch = useRef<inputsModel.Refetch>(noop);
  const { data } = useKibana().services;
  const { addError } = useAppToasts();

  // It needs to be memoized otherwise `useObservable` would receive a new instance on every render
  const searchDataOptionalSignal = useMemo(
    () =>
      withOptionalSignal<UseSearchStrategyRequestArgs, Observable<StrategyResponseType<QueryType>>>(
        searchComplete
      ),
    []
  );

  const { start, error, result, loading } = useObservable(searchDataOptionalSignal);

  useEffect(() => {
    if (error != null) {
      addError(error, {
        title: errorMessage ?? i18n.DEFAULT_ERROR_SEARCH_STRATEGY(factoryQueryType),
      });
    }
  }, [addError, error, errorMessage, factoryQueryType]);

  const searchCb = useCallback(
    (
      props: OptionalSignalArgs<
        Omit<
          UseSearchStrategyRequestArgs,
          'data' | 'factoryQueryType' | 'getTransformChangesIfTheyExist'
        >
      >
    ) => {
      const asyncSearch = () => {
        start({ ...props, data, factoryQueryType, getTransformChangesIfTheyExist });
      };

      asyncSearch();

      refetch.current = asyncSearch;
    },
    [data, start, factoryQueryType, getTransformChangesIfTheyExist]
  );

  const [formatedResult, inspect] = useMemo(
    () => [
      omit<StrategyResponseType<QueryType>, 'rawResponse'>('rawResponse', result),
      getInspectResponse(result, {
        dsl: [],
        response: [],
      }),
    ],
    [result]
  );

  return {
    loading,
    result: result ? formatedResult : initialResult,
    error,
    search: searchCb,
    refetch: refetch.current,
    inspect,
  };
};
// TODO add unit test
