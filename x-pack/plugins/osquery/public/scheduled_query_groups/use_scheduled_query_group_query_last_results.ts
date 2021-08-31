/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';

import { useKibana } from '../common/lib/kibana';

interface UseScheduledQueryGroupQueryLastResultsProps {
  actionId: string;
  agentIds?: string[];
  interval: number;
  skip?: boolean;
}

export const useScheduledQueryGroupQueryLastResults = ({
  actionId,
  agentIds,
  interval,
  skip = false,
}: UseScheduledQueryGroupQueryLastResultsProps) => {
  const data = useKibana().services.data;

  return useQuery(
    ['scheduledQueryLastResults', { actionId }],
    async () => {
      const indexPattern = await data.indexPatterns.find('logs-*');
      const searchSource = await data.search.searchSource.create({
        index: indexPattern[0],
        size: 0,
        aggs: {
          runs: {
            terms: {
              field: 'response_id',
              order: { first_event_ingested_time: 'desc' },
              size: 1,
            },
            aggs: {
              first_event_ingested_time: { min: { field: '@timestamp' } },
              unique_agents: { cardinality: { field: 'agent.id' } },
            },
          },
        },
        query: {
          // @ts-expect-error update types
          bool: {
            should: agentIds?.map((agentId) => ({
              match_phrase: {
                'agent.id': agentId,
              },
            })),
            minimum_should_match: 1,
            filter: [
              {
                match_phrase: {
                  action_id: actionId,
                },
              },
              {
                range: {
                  '@timestamp': {
                    gte: `now-${interval * 2}s`,
                    lte: 'now',
                  },
                },
              },
            ],
          },
        },
      });

      return searchSource.fetch$().toPromise();
    },
    {
      keepPreviousData: true,
      enabled: !!(!skip && actionId && interval && agentIds?.length),
      // @ts-expect-error update types
      select: (response) => response.rawResponse.aggregations?.runs?.buckets[0] ?? [],
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    }
  );
};
