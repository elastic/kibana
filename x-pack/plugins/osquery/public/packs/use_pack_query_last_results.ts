/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';
import moment from 'moment-timezone';
import { DataView, SortDirection } from '../../../../../src/plugins/data/common';
import { useKibana } from '../common/lib/kibana';

interface UsePackQueryLastResultsProps {
  actionId: string;
  agentIds?: string[];
  interval: number;
  logsDataView?: DataView;
  skip?: boolean;
}

export const usePackQueryLastResults = ({
  actionId,
  interval,
  logsDataView,
  skip = false,
}: UsePackQueryLastResultsProps) => {
  const data = useKibana().services.data;

  return useQuery(
    ['scheduledQueryLastResults', { actionId }],
    async () => {
      const lastResultsSearchSource = await data.search.searchSource.create({
        size: 1,
        sort: [{ '@timestamp': SortDirection.desc }],
        query: {
          // @ts-expect-error update types
          bool: {
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

      lastResultsSearchSource.setField('index', logsDataView);

      const lastResultsResponse = await lastResultsSearchSource.fetch$().toPromise();
      const timestamp = lastResultsResponse.rawResponse?.hits?.hits[0]?.fields?.['@timestamp'][0];

      if (timestamp) {
        const aggsSearchSource = await data.search.searchSource.create({
          size: 1,
          query: {
            // @ts-expect-error update types
            bool: {
              filter: [
                {
                  range: {
                    '@timestamp': {
                      gte: moment(timestamp).subtract(interval, 'seconds').format(),
                      lte: moment(timestamp).format(),
                    },
                  },
                },
                {
                  match_phrase: {
                    action_id: actionId,
                  },
                },
              ],
            },
          },
        });

        aggsSearchSource.setField('index', logsDataView);
        aggsSearchSource.setField('aggs', {
          unique_agents: { cardinality: { field: 'agent.id' } },
        });
        const aggsResponse = await aggsSearchSource.fetch$().toPromise();

        return {
          '@timestamp': lastResultsResponse.rawResponse?.hits?.hits[0]?.fields?.['@timestamp'],
          // @ts-expect-error update types
          uniqueAgentsCount: aggsResponse.rawResponse.aggregations?.unique_agents?.value,
          docCount: aggsResponse?.rawResponse?.hits?.total,
        };
      }

      return null;
    },
    {
      keepPreviousData: true,
      enabled: !!(!skip && actionId && interval && logsDataView),
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    }
  );
};
