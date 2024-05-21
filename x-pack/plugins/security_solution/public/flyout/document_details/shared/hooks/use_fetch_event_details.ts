/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsQuery } from '@kbn/es-query';
import type { IEsSearchRequest } from '@kbn/search-types';
import { useQuery } from '@tanstack/react-query';
import { useTimelineDataFilters } from '../../../../timelines/containers/use_timeline_data_filters';
import { isActiveTimeline } from '../../../../helpers';
import type { SearchHit } from '../../../../../common/search_strategy';
import { createFetchData } from '../utils/fetch_data';
import { useKibana } from '../../../../common/lib/kibana';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';

const QUERY_KEY = 'useFetchEventDetails';

export interface UseFetchEventDetailsParams {
  /**
   *
   * */
  eventId: string;
}

export interface UseFetchEventDetailsResult {
  /**
   * Returns true if data is being loaded
   */
  loading: boolean;
  /**
   * Returns true if fetching data has errored out
   */
  error: boolean;
  /**
   *
   */
  data: SearchHit | undefined;
}

/**
 *
 */
export const useFetchEventDetails = ({
  eventId,
}: UseFetchEventDetailsParams): UseFetchEventDetailsResult => {
  const {
    services: {
      data: { search: searchService },
    },
  } = useKibana();

  const { selectedPatterns } = useTimelineDataFilters(isActiveTimeline(SourcererScopeName.default));

  const searchRequest = buildSearchRequest(eventId, selectedPatterns);

  const { data, isLoading, isError } = useQuery(
    [QUERY_KEY, eventId],
    () => createFetchData<SearchHit>(searchService, searchRequest),
    {
      cacheTime: 10 * 60 * 1000,
      staleTime: 10 * 60 * 1000,
    }
  );

  return {
    loading: isLoading,
    error: isError,
    data,
  };
};

/**
 *
 */
const buildSearchRequest = (eventId: string, selectedPatterns: string[]): IEsSearchRequest => {
  const query = buildEsQuery(
    undefined,
    [],
    [
      {
        query: {
          terms: {
            _id: [eventId],
          },
        },
        meta: {},
      },
    ]
  );

  return {
    params: {
      index: selectedPatterns,
      body: {
        query,
      },
    },
  };
};
