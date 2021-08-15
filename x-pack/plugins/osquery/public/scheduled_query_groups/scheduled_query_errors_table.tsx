/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { EuiInMemoryTable, EuiCodeBlock, EuiToolTip, EuiButtonIcon } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { encode } from 'rison-node';
import { stringify } from 'querystring';

import { useQuery } from 'react-query';
import { timeStamp } from 'console';
import { SortDirection } from '../../../../../src/plugins/data/public';
import { useKibana, isModifiedEvent, isLeftClickEvent } from '../common/lib/kibana';
import { AgentIdToName } from '../agents/agent_id_to_name';

const VIEW_IN_LOGS = i18n.translate(
  'xpack.osquery.scheduledQueryGroup.queriesTable.viewLogsErrorsActionAriaLabel',
  {
    defaultMessage: 'View in Logs',
  }
);

interface ViewErrorsInLogsActionProps {
  actionId: string;
  agentId: string;
  timestamp?: string;
}

const ViewErrorsInLogsActionComponent: React.FC<ViewErrorsInLogsActionProps> = ({
  actionId,
  agentId,
  timestamp,
}) => {
  const navigateToApp = useKibana().services.application.navigateToApp;

  const handleClick = useCallback(
    (event) => {
      const openInNewTab = !(!isModifiedEvent(event) && isLeftClickEvent(event));

      event.preventDefault();
      const queryString = stringify({
        logPosition: encode({
          end: timestamp,
          streamLive: false,
        }),
        logFilter: encode({
          expression: `elastic_agent.id:${agentId} and (data_stream.dataset:elastic_agent or data_stream.dataset:elastic_agent.osquerybeat) and "${actionId}"`,
          kind: 'kuery',
        }),
      });

      navigateToApp('logs', {
        path: `stream?${queryString}`,
        openInNewTab,
      });
    },
    [actionId, agentId, navigateToApp, timestamp]
  );

  return (
    <EuiToolTip content={VIEW_IN_LOGS}>
      <EuiButtonIcon iconType="search" onClick={handleClick} aria-label={VIEW_IN_LOGS} />
    </EuiToolTip>
  );
};

export const ViewErrorsInLogsAction = React.memo(ViewErrorsInLogsActionComponent);

interface ScheduledQueryErrorsTableProps {
  actionId: string;
  interval: string;
}

const renderErrorMessage = (error: string) => (
  <EuiCodeBlock language="prolog" fontSize="s" paddingSize="none" transparentBackground>
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
        aggs: {
          unique_agents: { cardinality: { field: 'agent.id' } },
        },
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
                term: {
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

  const renderLogsErrorsAction = useCallback(
    (item) => {
      console.error('iteeee', item);
      return (
        <ViewErrorsInLogsAction
          actionId={actionId}
          agentId={item?.fields['elastic_agent.id'][0]}
          timestamp={item?.fields['event.ingested'][0]}
        />
      );
    },
    [actionId]
  );

  const columns = useMemo(
    () => [
      {
        field: 'fields.@timestamp',
        name: '@timestamp',
        width: '220px',
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
      {
        width: '90px',
        actions: [
          {
            render: renderLogsErrorsAction,
          },
        ],
      },
    ],
    [renderAgentIdColumn, renderLogsErrorsAction]
  );

  const pagination = useMemo(
    () => ({
      initialPageSize: 10,
      pageSizeOptions: [10, 20, 50, 100],
    }),
    []
  );

  console.error('lastErrosData', lastErrosData);

  return lastErrosData?.hits.length ? (
    <EuiInMemoryTable items={lastErrosData.hits} columns={columns} pagination={pagination} />
  ) : null;
};

export const ScheduledQueryErrorsTable = React.memo(ScheduledQueryErrorsTableComponent);
