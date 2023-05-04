/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { EuiInMemoryTable, EuiCodeBlock } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { AgentIdToName } from '../agents/agent_id_to_name';
import { useActionResults } from './use_action_results';
import { Direction } from '../../common/search_strategy';
import { useActionResultsPrivileges } from './use_action_privileges';

interface ActionResultsSummaryProps {
  actionId: string;
  expirationDate?: string;
  agentIds?: string[];
  error?: string;
}

const renderErrorMessage = (error: string) => (
  <EuiCodeBlock language="shell" fontSize="s" paddingSize="none" transparentBackground>
    {error}
  </EuiCodeBlock>
);

const ActionResultsSummaryComponent: React.FC<ActionResultsSummaryProps> = ({
  actionId,
  expirationDate,
  agentIds,
  error,
}) => {
  const [pageIndex] = useState(0);
  const [pageSize] = useState(50);
  const expired = useMemo(
    () => (!expirationDate ? false : new Date(expirationDate) < new Date()),
    [expirationDate]
  );
  const [isLive, setIsLive] = useState(true);
  const { data: hasActionResultsPrivileges } = useActionResultsPrivileges();
  const {
    // @ts-expect-error update types
    data: { aggregations, edges },
  } = useActionResults({
    actionId,
    activePage: pageIndex,
    agentIds,
    limit: pageSize,
    direction: Direction.asc,
    sortField: '@timestamp',
    isLive,
    skip: !hasActionResultsPrivileges,
  });

  useEffect(() => {
    if (error) {
      edges.forEach((edge) => {
        if (edge.fields) {
          edge.fields['error.skipped'] = edge.fields.error = [
            i18n.translate('xpack.osquery.liveQueryActionResults.table.skippedErrorText', {
              defaultMessage:
                "This query hasn't been called due to parameter used and its value not found in the alert.",
            }),
          ];
        }
      });
    } else if (expired) {
      edges.forEach((edge) => {
        if (!edge.fields?.completed_at && edge.fields) {
          edge.fields['error.keyword'] = edge.fields.error = [
            i18n.translate('xpack.osquery.liveQueryActionResults.table.expiredErrorText', {
              defaultMessage: 'The action request timed out.',
            }),
          ];
        }
      });
    }
  }, [edges, error, expired]);

  const renderAgentIdColumn = useCallback((agentId) => <AgentIdToName agentId={agentId} />, []);
  const renderRowsColumn = useCallback((rowsCount) => rowsCount ?? '-', []);
  const renderStatusColumn = useCallback(
    (_, item) => {
      if (item.fields['error.skipped']) {
        return i18n.translate('xpack.osquery.liveQueryActionResults.table.skippedStatusText', {
          defaultMessage: 'skipped',
        });
      }

      if (!item.fields.completed_at) {
        return expired
          ? i18n.translate('xpack.osquery.liveQueryActionResults.table.expiredStatusText', {
              defaultMessage: 'expired',
            })
          : i18n.translate('xpack.osquery.liveQueryActionResults.table.pendingStatusText', {
              defaultMessage: 'pending',
            });
      }

      if (item.fields['error.keyword']) {
        return i18n.translate('xpack.osquery.liveQueryActionResults.table.errorStatusText', {
          defaultMessage: 'error',
        });
      }

      return i18n.translate('xpack.osquery.liveQueryActionResults.table.successStatusText', {
        defaultMessage: 'success',
      });
    },
    [expired]
  );

  const columns = useMemo(
    () => [
      {
        field: 'status',
        name: i18n.translate('xpack.osquery.liveQueryActionResults.table.statusColumnTitle', {
          defaultMessage: 'Status',
        }),
        render: renderStatusColumn,
      },
      {
        field: 'fields.agent_id[0]',
        name: i18n.translate('xpack.osquery.liveQueryActionResults.table.agentIdColumnTitle', {
          defaultMessage: 'Agent Id',
        }),
        truncateText: true,
        render: renderAgentIdColumn,
      },
      {
        field: '_source.action_response.osquery.count',
        name: i18n.translate(
          'xpack.osquery.liveQueryActionResults.table.resultRowsNumberColumnTitle',
          {
            defaultMessage: 'Number of result rows',
          }
        ),
        render: renderRowsColumn,
      },
      {
        field: 'fields.error[0]',
        name: i18n.translate('xpack.osquery.liveQueryActionResults.table.errorColumnTitle', {
          defaultMessage: 'Error',
        }),
        render: renderErrorMessage,
      },
    ],
    [renderAgentIdColumn, renderRowsColumn, renderStatusColumn]
  );

  const pagination = useMemo(
    () => ({
      initialPageSize: 20,
      pageSizeOptions: [10, 20, 50, 100],
    }),
    []
  );

  useEffect(() => {
    setIsLive(() => {
      if (!agentIds?.length || expired || error) return false;

      return !!(aggregations.totalResponded !== agentIds?.length);
    });
  }, [agentIds?.length, aggregations.totalResponded, error, expired]);

  return edges.length ? (
    <EuiInMemoryTable loading={isLive} items={edges} columns={columns} pagination={pagination} />
  ) : null;
};

export const ActionResultsSummary = React.memo(ActionResultsSummaryComponent);
