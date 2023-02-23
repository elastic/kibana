/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  QueryObserverResult,
  RefetchOptions,
  RefetchQueryFilters,
  useQuery,
} from '@tanstack/react-query';
import semverCoerce from 'semver/functions/coerce';

import { useKibana } from '../../utils/kibana_react';

export interface NewsItem {
  title: { en: string };
  description: { en: string };
  link_url: { en: string };
  image_url?: { en: string } | null;
}

interface NewsFeed {
  items: NewsItem[];
}

interface UseFetchNewsParams {
  kibanaVersion: string;
}

interface UseFetchNewsResponse {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  newsFeed: NewsFeed | undefined;
  refetch: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
  ) => Promise<QueryObserverResult<NewsFeed | undefined, unknown>>;
}

export function useFetchNewsFeed({ kibanaVersion }: UseFetchNewsParams): UseFetchNewsResponse {
  const { http } = useKibana().services;

  const { isLoading, isError, isSuccess, data, refetch } = useQuery({
    queryKey: ['fetchNewsFeed', { kibanaVersion }],
    queryFn: async () => {
      try {
        return await http.get<NewsFeed>(
          `https://feeds.elastic.co/observability-solution/v${removeSuffixFromVersion(
            kibanaVersion
          )}.json`
        );
      } catch (e) {
        console.error('Error while fetching news feed', e);
        return { items: [] };
      }
    },
  });

  return { isLoading, isSuccess, isError, newsFeed: data, refetch };
}

/**
 * Removes the suffix that is sometimes appended to the Kibana version,
 * (e.g. `8.0.0-SNAPSHOT-rc1`), which is typically only seen in non-production
 * environments
 */
const removeSuffixFromVersion = (kibanaVersion?: string) =>
  semverCoerce(kibanaVersion)?.version ?? kibanaVersion;
