/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';
import { IndexPattern, SortDirection } from '../../../../../src/plugins/data/common';

import { useKibana } from '../common/lib/kibana';

interface UseScheduledQueryGroupQueryErrorsProps {
  actionId: string;
  agentIds?: string[];
  interval: number;
  logsIndexPattern?: IndexPattern;
  skip?: boolean;
}

export const useScheduledQueryGroupQueryErrors = ({
  actionId,
  agentIds,
  interval,
  logsIndexPattern,
  skip = false,
}: UseScheduledQueryGroupQueryErrorsProps) => {
  const data = useKibana().services.data;

  return useQuery(
    ['scheduledQueryErrors', { actionId, interval }],
    async () => {
      const searchSource = await data.search.searchSource.create({
        index: logsIndexPattern,
        fields: ['*'],
        sort: [
          {
            '@timestamp': SortDirection.desc,
          },
        ],
        query: {
          // @ts-expect-error update types
          bool: {
            should: agentIds?.map((agentId) => ({
              match_phrase: {
                'elastic_agent.id': agentId,
              },
            })),
            minimum_should_match: 1,
            filter: [
              {
                match_phrase: {
                  message: 'Error',
                },
              },
              {
                match_phrase: {
                  'data_stream.dataset': 'elastic_agent.osquerybeat',
                },
              },
              {
                match_phrase: {
                  message: actionId,
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
        size: 1000,
      });

      return searchSource.fetch$().toPromise();
    },
    {
      keepPreviousData: true,
      enabled: !!(!skip && actionId && interval && agentIds?.length && logsIndexPattern),
      select: (response) => response.rawResponse.hits ?? [],
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    }
  );
};
