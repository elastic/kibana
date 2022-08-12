/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import { filter, tap } from 'rxjs/operators';
import { noop, omit } from 'lodash/fp';
import { useCallback, useEffect, useRef, useMemo } from 'react';
import type { Observable } from 'rxjs';

import type { OptionalSignalArgs } from '@kbn/securitysolution-hook-utils';
import { useObservable } from '@kbn/securitysolution-hook-utils';

import type { IKibanaSearchResponse } from '@kbn/data-plugin/common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { isCompleteResponse, isErrorResponse } from '@kbn/data-plugin/public';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import { RequestAdapter } from '@kbn/inspector-plugin/common';

import type {
  FactoryQueryTypes,
  RequestBasicOptions,
  StrategyRequestType,
  StrategyResponseType,
} from '../../../../common/search_strategy/security_solution';
import { getInspectResponse } from '../../../helpers';
import type { inputsModel } from '../../store';
import { useKibana } from '../../lib/kibana';
import { useAppToasts } from '../../hooks/use_app_toasts';
import { DEFAULT_ERROR_SEARCH_STRATEGY } from './translations';

type UseSearchStrategyRequestArgs = RequestBasicOptions & {
  data: DataPublicPluginStart;
  signal: AbortSignal;
  factoryQueryType: FactoryQueryTypes;
};

const search = <ResponseType extends IKibanaSearchResponse>({
  data,
  signal,
  factoryQueryType,
  defaultIndex,
  filterQuery,
  timerange,
  ...requestProps
}: UseSearchStrategyRequestArgs): Observable<ResponseType> => {
  return data.search.search<RequestBasicOptions, ResponseType>(
    {
      ...requestProps,
      factoryQueryType,
      defaultIndex,
      timerange,
      filterQuery,
    },
    {
      strategy: 'securitySolutionSearchStrategy',
      abortSignal: signal,
    }
  );
};

const logInspectorRequest = (inspectorAdapters, startTime) => {
  if (!inspectorAdapters.requests) {
    inspectorAdapters.requests = new RequestAdapter();
  }

  const request = inspectorAdapters.requests.start(
    i18n.translate('data.search.dataRequest.title', {
      defaultMessage: 'Data',
    }),
    {
      description: i18n.translate('data.search.es_search.dataRequest.description', {
        defaultMessage:
          'This request queries Elasticsearch to fetch the data for the visualization.',
      }),
    },
    startTime
  );

  return request;
};

const searchComplete = <ResponseType extends IKibanaSearchResponse>(
  props: UseSearchStrategyRequestArgs
): Observable<ResponseType> => {
  const { adapters: inspectorAdapters, startTime, ...searchProps } = props;
  return search<ResponseType>(searchProps).pipe(
    tap({
      next({ rawResponse, took, inspect }) {
        logInspectorRequest(inspectorAdapters, startTime)
          .stats({
            hits: {
              label: i18n.translate('data.search.es_search.hitsLabel', {
                defaultMessage: 'Hits',
              }),
              value: `${rawResponse?.hits?.hits?.length}` ?? '',
              description: i18n.translate('data.search.es_search.hitsDescription', {
                defaultMessage: 'The number of documents returned by the query.',
              }),
            },
            queryTime: {
              label: i18n.translate('data.search.es_search.queryTimeLabel', {
                defaultMessage: 'Query time',
              }),
              value: i18n.translate('data.search.es_search.queryTimeValue', {
                defaultMessage: '{queryTime}ms',
                values: { queryTime: took },
              }),
              description: i18n.translate('data.search.es_search.queryTimeDescription', {
                defaultMessage:
                  'The time it took to process the query. ' +
                  'Does not include the time to send the request or parse it in the browser.',
              }),
            },
          })
          .json(JSON.parse(inspect?.dsl[0] ?? {})?.body)
          .ok({ json: rawResponse });

        inspectorAdapters.tables.logDatatable('default', {
          type: 'test table',
          columns: [
            {
              id: 'host.name',
              name: 'Host name',
              meta: 'source field',
            },
            {
              id: 'lastseen',
              name: 'Last seen',
              meta: '',
            },
          ],
          // rows: [{ id: '@timestamp', value: 'my test value' }],
          rows: rawResponse?.aggregations?.host_data?.buckets?.map((bucket) => ({
            'host.name': bucket?.key ?? '',
            lastseen: bucket?.lastSeen.value_as_string ?? '',
          })),
        });
      },
      error(error) {
        logInspectorRequest(inspectorAdapters, startTime).error({ json: error });
      },
    }),
    filter((response) => {
      return isErrorResponse(response) || isCompleteResponse(response);
    })
  );
};

const EMPTY_INSPECT = {
  dsl: [],
  response: [],
};

export const useSearchStrategy = <QueryType extends FactoryQueryTypes>({
  factoryQueryType,
  initialResult,
  errorMessage,
  abort = false,
  inspectorAdapters,
}: {
  factoryQueryType: QueryType;
  /**
   * `result` initial value. It is used until the search strategy returns some data.
   */
  initialResult: Omit<StrategyResponseType<QueryType>, 'rawResponse'>;
  /**
   * Message displayed to the user on a Toast when an erro happens.
   */
  errorMessage?: string;
  /**
   * When the flag switches from `false` to `true`, it will abort any ongoing request.
   */
  abort?: boolean;
}) => {
  const abortCtrl = useRef(new AbortController());

  const refetch = useRef<inputsModel.Refetch>(noop);
  const { data } = useKibana().services;
  const { addError } = useAppToasts();

  const { start, error, result, loading } = useObservable<
    [UseSearchStrategyRequestArgs],
    StrategyResponseType<QueryType>
  >(searchComplete);

  useEffect(() => {
    if (error != null && !(error instanceof AbortError)) {
      addError(error, {
        title: errorMessage ?? DEFAULT_ERROR_SEARCH_STRATEGY(factoryQueryType),
      });
    }
  }, [addError, error, errorMessage, factoryQueryType]);

  const searchCb = useCallback(
    (props: OptionalSignalArgs<StrategyRequestType<QueryType>>) => {
      const asyncSearch = () => {
        abortCtrl.current = new AbortController();
        start({
          ...props,
          data,
          factoryQueryType,
          signal: abortCtrl.current.signal,
        } as never); // This typescast is required because every StrategyRequestType instance has different fields.
      };

      abortCtrl.current.abort();
      asyncSearch();

      refetch.current = asyncSearch;
    },
    [data, start, factoryQueryType]
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
