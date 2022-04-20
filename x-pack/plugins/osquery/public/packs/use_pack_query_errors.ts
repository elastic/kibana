/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';
import { lastValueFrom } from 'rxjs';
import { DataView, SortDirection } from '@kbn/data-plugin/common';

import { useKibana } from '../common/lib/kibana';

interface UsePackQueryErrorsProps {
  actionId: string;
  interval: number;
  logsDataView?: DataView;
  skip?: boolean;
}

export const usePackQueryErrors = ({
  actionId,
  interval,
  logsDataView,
  skip = false,
}: UsePackQueryErrorsProps) => {
  const data = useKibana().services.data;

  return useQuery(
    ['scheduledQueryErrors', { actionId, interval }],
    async () => {
      const searchSource = await data.search.searchSource.create({
        fields: ['*'],
        sort: [
          {
            '@timestamp': SortDirection.desc,
          },
        ],
        query: {
          // @ts-expect-error update types
          bool: {
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

      searchSource.setField('index', logsDataView);

      return lastValueFrom(searchSource.fetch$());
    },
    {
      keepPreviousData: true,
      enabled: !!(!skip && actionId && interval && logsDataView),
      select: (response) => response.rawResponse.hits ?? [],
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    }
  );
};
