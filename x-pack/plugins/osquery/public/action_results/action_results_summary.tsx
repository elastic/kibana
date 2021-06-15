/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import { i18n } from '@kbn/i18n';
import {
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCard,
  EuiTextColor,
  EuiSpacer,
  EuiDescriptionList,
  EuiInMemoryTable,
  EuiCodeBlock,
  EuiProgress,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';

import { PLUGIN_ID } from '../../../fleet/common';
import { pagePathGetters } from '../../../fleet/public';
import { useActionResults } from './use_action_results';
import { useAllResults } from '../results/use_all_results';
import { Direction } from '../../common/search_strategy';
import { useKibana } from '../common/lib/kibana';

const StyledEuiCard = styled(EuiCard)`
  position: relative;
`;

interface ActionResultsSummaryProps {
  actionId: string;
  agentIds?: string[];
  isLive?: boolean;
}

const renderErrorMessage = (error: string) => (
  <EuiCodeBlock language="shell" fontSize="s" paddingSize="none" transparentBackground>
    {error}
  </EuiCodeBlock>
);

const ActionResultsSummaryComponent: React.FC<ActionResultsSummaryProps> = ({
  actionId,
  agentIds,
  isLive,
}) => {
  const getUrlForApp = useKibana().services.application.getUrlForApp;
  // @ts-expect-error update types
  const [pageIndex, setPageIndex] = useState(0);
  // @ts-expect-error update types
  const [pageSize, setPageSize] = useState(50);
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
  });

  const { data: logsResults } = useAllResults({
    actionId,
    activePage: pageIndex,
    limit: pageSize,
    sort: [
      {
        field: '@timestamp',
        direction: Direction.asc,
      },
    ],
    isLive,
  });

  const notRespondedCount = useMemo(() => {
    if (!agentIds || !aggregations.totalResponded) {
      return '-';
    }

    return agentIds.length - aggregations.totalResponded;
  }, [aggregations.totalResponded, agentIds]);

  const listItems = useMemo(
    () => [
      {
        title: i18n.translate(
          'xpack.osquery.liveQueryActionResults.summary.agentsQueriedLabelText',
          {
            defaultMessage: 'Agents queried',
          }
        ),
        description: agentIds?.length,
      },
      {
        title: i18n.translate('xpack.osquery.liveQueryActionResults.summary.successfulLabelText', {
          defaultMessage: 'Successful',
        }),
        description: aggregations.successful,
      },
      {
        title: i18n.translate('xpack.osquery.liveQueryActionResults.summary.pendingLabelText', {
          defaultMessage: 'Not yet responded',
        }),
        description: notRespondedCount,
      },
      {
        title: i18n.translate('xpack.osquery.liveQueryActionResults.summary.failedLabelText', {
          defaultMessage: 'Failed',
        }),
        description: (
          <EuiTextColor color={aggregations.failed ? 'danger' : 'default'}>
            {aggregations.failed}
          </EuiTextColor>
        ),
      },
    ],
    [agentIds, aggregations.failed, aggregations.successful, notRespondedCount]
  );

  const renderAgentIdColumn = useCallback(
    (agentId) => (
      <EuiLink
        className="eui-textTruncate"
        href={getUrlForApp(PLUGIN_ID, {
          path: `#` + pagePathGetters.fleet_agent_details({ agentId }),
        })}
        target="_blank"
      >
        {agentId}
      </EuiLink>
    ),
    [getUrlForApp]
  );

  const renderRowsColumn = useCallback(
    (_, item) => {
      if (!logsResults) return '-';
      const agentId = item.fields.agent_id[0];

      return (
        // @ts-expect-error update types
        logsResults?.rawResponse?.aggregations?.count_by_agent_id?.buckets?.find(
          // @ts-expect-error update types
          (bucket) => bucket.key === agentId
        )?.doc_count ?? '-'
      );
    },
    [logsResults]
  );

  const renderStatusColumn = useCallback((_, item) => {
    if (!item.fields.completed_at) {
      return i18n.translate('xpack.osquery.liveQueryActionResults.table.pendingStatusText', {
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
  }, []);

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
        field: 'fields.rows[0]',
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

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <StyledEuiCard title="" description="" textAlign="left">
            {notRespondedCount ? <EuiProgress size="xs" position="absolute" /> : null}
            <EuiDescriptionList
              compressed
              textStyle="reverse"
              type="responsiveColumn"
              listItems={listItems}
            />
          </StyledEuiCard>
        </EuiFlexItem>
      </EuiFlexGroup>

      {edges.length ? (
        <>
          <EuiSpacer />
          <EuiInMemoryTable items={edges} columns={columns} pagination={pagination} />
        </>
      ) : null}
    </>
  );
};

export const ActionResultsSummary = React.memo(ActionResultsSummaryComponent);
