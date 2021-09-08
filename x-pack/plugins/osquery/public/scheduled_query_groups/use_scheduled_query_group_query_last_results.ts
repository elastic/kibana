/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';
import { IndexPattern } from '../../../../../src/plugins/data/common';
import { useKibana } from '../common/lib/kibana';

interface UseScheduledQueryGroupQueryLastResultsProps {
  actionId: string;
  agentIds?: string[];
  interval: number;
  logsIndexPattern?: IndexPattern;
  skip?: boolean;
}

export const useScheduledQueryGroupQueryLastResults = ({
  actionId,
  agentIds,
  interval,
  logsIndexPattern,
  skip = false,
}: UseScheduledQueryGroupQueryLastResultsProps) => {
  const data = useKibana().services.data;

  return useQuery(
    ['scheduledQueryLastResults', { actionId }],
    async () => {
      const lastResultsSearchSource = await data.search.searchSource.create({
        index: logsIndexPattern,
        size: 1,
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
            ],
          },
        },
      });

      const lastResultsResponse = await lastResultsSearchSource.fetch$().toPromise();

      const responseId = lastResultsResponse.rawResponse?.hits?.hits[0]?._source?.response_id;

      if (responseId) {
        const aggsSearchSource = await data.search.searchSource.create({
          index: logsIndexPattern,
          size: 0,
          aggs: {
            unique_agents: { cardinality: { field: 'agent.id' } },
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
                  match_phrase: {
                    response_id: responseId,
                  },
                },
              ],
            },
          },
        });

        const aggsResponse = await aggsSearchSource.fetch$().toPromise();

        return {
          '@timestamp': lastResultsResponse.rawResponse?.hits?.hits[0]?.fields?.['@timestamp'],
          // @ts-expect-error update types
          uniqueAgentsCount: aggsResponse.rawResponse.aggregations?.unique_agents?.value,
          docCount: aggsResponse.rawResponse?.hits?.total,
        };
      }

      return null;
    },
    {
      keepPreviousData: true,
      enabled: !!(!skip && actionId && interval && agentIds?.length && logsIndexPattern),
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    }
  );
};
