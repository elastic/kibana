/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { EuiInMemoryTable, EuiCodeBlock, EuiToolTip, EuiButtonIcon } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { encode } from 'rison-node';
import { stringify } from 'querystring';

import { useKibana, isModifiedEvent, isLeftClickEvent } from '../common/lib/kibana';
import { AgentIdToName } from '../agents/agent_id_to_name';
import { usePackQueryErrors } from './use_pack_query_errors';
import { SearchHit } from '../../common/search_strategy';

const VIEW_IN_LOGS = i18n.translate(
  'xpack.osquery.pack.queriesTable.viewLogsErrorsActionAriaLabel',
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
  agentIds?: string[];
  interval: number;
}

const renderErrorMessage = (error: string) => (
  <EuiCodeBlock fontSize="s" paddingSize="none" transparentBackground>
    {error}
  </EuiCodeBlock>
);

const ScheduledQueryErrorsTableComponent: React.FC<ScheduledQueryErrorsTableProps> = ({
  actionId,
  interval,
}) => {
  const { data: lastErrorsData } = usePackQueryErrors({
    actionId,
    interval,
  });

  const renderAgentIdColumn = useCallback((agentId) => <AgentIdToName agentId={agentId} />, []);

  const renderLogsErrorsAction = useCallback(
    (item) => (
      <ViewErrorsInLogsAction
        actionId={actionId}
        agentId={item?.fields['elastic_agent.id'][0]}
        timestamp={item?.fields['event.ingested'][0]}
      />
    ),
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
        width: '50px',
        actions: [
          {
            render: renderLogsErrorsAction,
          },
        ],
      },
    ],
    [renderAgentIdColumn, renderLogsErrorsAction]
  );

  return (
    <EuiInMemoryTable<SearchHit>
      // eslint-disable-next-line react-perf/jsx-no-new-array-as-prop
      items={lastErrorsData?.hits ?? []}
      columns={columns}
      pagination={true}
    />
  );
};

export const ScheduledQueryErrorsTable = React.memo(ScheduledQueryErrorsTableComponent);
