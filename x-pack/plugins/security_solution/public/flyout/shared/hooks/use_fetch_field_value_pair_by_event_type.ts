/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsQuery } from '@kbn/es-query';
import type { IEsSearchRequest } from '@kbn/data-plugin/public';
import { useQuery } from '@tanstack/react-query';
import { createFetchData } from '../utils/fetch_data';
import { useKibana } from '../../../common/lib/kibana';
import { inputsSelectors } from '../../../common/store';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import type { RawResponse } from '../utils/fetch_data';

const QUERY_KEY = 'FetchFieldValuePairByEventType';

export enum EventKind {
  alert = 'alert',
  asset = 'asset',
  enrichment = 'enrichment',
  event = 'event',
  metric = 'metric',
  state = 'state',
  pipeline_error = 'pipeline_error',
  signal = 'signal',
}

export interface EventType {
  eventKind: EventKind;
  include?: boolean;
  exclude?: boolean;
}

export interface UseFetchFieldValuePairByEventTypeParams {
  /**
   * The highlighted field name and values
   * */
  highlightedField: { name: string; values: string[] };
  /**
   * True is the current timeline is active ('timeline-1')
   */
  isActiveTimelines: boolean;
  /**
   * Limit the search to include or exclude a specific value for the event.kind field
   * (alert, asset, enrichment, event, metric, state, pipeline_error, signal)
   */
  type: EventType;
}

export interface UseFetchFieldValuePairByEventTypeResult {
  /**
   * Returns true if data is being loaded
   */
  loading: boolean;
  /**
   * Returns true if fetching data has errored out
   */
  error: boolean;
  /**
   * Number of unique hosts found for the field/value pair
   */
  count: number;
}

/**
 * Hook to retrieve all the unique hosts in the environment that have the field/value pair, using ReactQuery.
 */
export const useFetchFieldValuePairByEventType = ({
  highlightedField,
  isActiveTimelines,
  type,
}: UseFetchFieldValuePairByEventTypeParams): UseFetchFieldValuePairByEventTypeResult => {
  const {
    services: {
      data: { search: searchService },
    },
  } = useKibana();

  const timelineTime = useDeepEqualSelector((state) =>
    inputsSelectors.timelineTimeRangeSelector(state)
  );
  const globalTime = useGlobalTime();
  const { to, from } = isActiveTimelines ? timelineTime : globalTime;

  const { name, values } = highlightedField;

  const req: IEsSearchRequest = buildSearchRequest(name, values, from, to, type);

  const { data, isLoading, isError } = useQuery(
    [QUERY_KEY, name, values, from, to, type],
    () => createFetchData<RawResponse>(searchService, req),
    {
      select: (res) => res.hits.total,
      keepPreviousData: true,
    }
  );

  return {
    loading: isLoading,
    error: isError,
    count: data || 0,
  };
};

/**
 * Build the search request for the field/values pair, for a date range from/to.
 * We set the size to 0 as we only care about the total number of documents.
 * Passing signalEventKind as true will return only alerts (event.kind === "signal"), otherwise return all other documents (event.kind !== "signal")
 */
const buildSearchRequest = (
  field: string,
  values: string[],
  from: string,
  to: string,
  type: EventType
): IEsSearchRequest => {
  const query = buildEsQuery(
    undefined,
    [],
    [
      {
        query: {
          bool: {
            must: [
              {
                match: {
                  [field]: values[0],
                },
              },
              {
                range: {
                  '@timestamp': {
                    gte: from,
                    lte: to,
                  },
                },
              },
              ...(type.include
                ? [
                    {
                      match: {
                        'event.kind': type.eventKind,
                      },
                    },
                  ]
                : []),
            ],
            ...(type.exclude
              ? {
                  must_not: [
                    {
                      match: {
                        'event.kind': type.eventKind,
                      },
                    },
                  ],
                }
              : {}),
          },
        },
        meta: {},
      },
    ]
  );

  return {
    params: {
      body: {
        query,
        size: 1000,
      },
    },
  };
};
