/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import { i18n } from '@kbn/i18n';
import { EuiInMemoryTable, EuiCodeBlock } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useQuery } from 'react-query';
import { useKibana, isModifiedEvent, isLeftClickEvent } from '../common/lib/kibana';
import { AgentIdToName } from '../agents/agent_id_to_name';
import { useActionResults } from './use_action_results';
import { useAllResults } from '../results/use_all_results';
import { Direction } from '../../common/search_strategy';

interface ScheduledQueryErrorsTableProps {
  actionId: string;
  expirationDate?: string;
  agentIds?: string[];
}

const renderErrorMessage = (error: string) => (
  <EuiCodeBlock language="shell" fontSize="s" paddingSize="none" transparentBackground>
    {error}
  </EuiCodeBlock>
);

const ScheduledQueryErrorsTableComponent: React.FC<ScheduledQueryErrorsTableProps> = ({
  actionId,
  interval,
}) => {
  const data = useKibana().services.data;

  const { data: lastErrosData, isFetched } = useQuery(
    ['scheduledQueryErrors', { actionId, interval }],
    async () => {
      const indexPattern = await data.indexPatterns.find('logs-*');
      const searchSource = await data.search.searchSource.create({
        index: indexPattern[0],
        fields: ['*'],
        query: {
          bool: {
            must: [],
            filter: [
              {
                bool: {
                  should: [
                    {
                      match_phrase: {
                        message: actionId,
                      },
                    },
                    {
                      match_phrase: {
                        message: 'Error',
                      },
                    },
                  ],
                  minimum_should_match: 2,
                },
              },
              {
                range: {
                  '@timestamp': {
                    gte: `now-${(interval ?? 60) * 20000}s`,
                    lte: 'now',
                  },
                },
              },
            ],
            should: [],
            must_not: [],
          },
        },
        size: 100,
      });

      const responseData = await searchSource.fetch$().toPromise();

      console.error('lastErrosData', responseData);

      return responseData.rawResponse.hits;
    }
  );

  // @ts-expect-error update types
  const [pageIndex, setPageIndex] = useState(0);
  // @ts-expect-error update types
  const [pageSize, setPageSize] = useState(10);

  const renderAgentIdColumn = useCallback((agentId, itmee) => {
    console.error('aaaa', agentId, itmee);
    return <AgentIdToName agentId={agentId} />;
  }, []);

  // const renderRowsColumn = useCallback(
  //   (_, item) => {
  //     if (!logsResults) return '-';
  //     const agentId = item.fields.agent_id[0];

  //     return (
  //       // @ts-expect-error update types
  //       logsResults?.rawResponse?.aggregations?.count_by_agent_id?.buckets?.find(
  //         // @ts-expect-error update types
  //         (bucket) => bucket.key === agentId
  //       )?.doc_count ?? '-'
  //     );
  //   },
  //   [logsResults]
  // );

  const columns = useMemo(
    () => [
      {
        field: 'fields.@timestamp',
        name: '@timestamp',
        width: '15%',
      },
      {
        field: 'fields["elastic_agent.id"][0]',
        name: i18n.translate('xpack.osquery.scheduledQueryErrorsTable.agentIdColumnTitle', {
          defaultMessage: 'Agent Id',
        }),
        truncateText: true,
        render: renderAgentIdColumn,
        width: '15%',
      },
      {
        field: 'fields.message[0]',
        name: i18n.translate('xpack.osquery.scheduledQueryErrorsTable.errorColumnTitle', {
          defaultMessage: 'Error',
        }),
        render: renderErrorMessage,
      },
    ],
    [
      renderAgentIdColumn,
      //  renderRowsColumn
    ]
  );

  const pagination = useMemo(
    () => ({
      initialPageSize: 10,
      pageSizeOptions: [10, 20, 50, 100],
    }),
    []
  );

  return lastErrosData?.hits.length ? (
    <EuiInMemoryTable items={lastErrosData.hits} columns={columns} pagination={pagination} />
  ) : null;
};

export const ScheduledQueryErrorsTable = React.memo(ScheduledQueryErrorsTableComponent);
