/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiCard,
  EuiTextColor,
  EuiSpacer,
  EuiDescriptionList,
  EuiInMemoryTable,
  EuiCodeBlock,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';

import { useActionResults } from './use_action_results';
import { useAllResults } from '../results/use_all_results';
import { Direction } from '../../common/search_strategy';

interface ActionResultsSummaryProps {
  actionId: string;
  agentIds?: string[];
  isLive?: boolean;
}

const renderErrorMessage = (error: string) => (
  <EuiCodeBlock language="sql" fontSize="s" paddingSize="none" transparentBackground>
    {error}
  </EuiCodeBlock>
);

const ActionResultsSummaryComponent: React.FC<ActionResultsSummaryProps> = ({
  actionId,
  agentIds,
  isLive,
}) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const {
    // @ts-expect-error update types
    data: { aggregations, edges, totalCount },
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
    direction: Direction.asc,
    sortField: '@timestamp',
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
        title: 'Agents queried',
        description: agentIds?.length,
      },
      {
        title: 'Successful',
        description: aggregations.successful,
      },
      {
        title: 'Not yet responded',
        description: notRespondedCount,
      },
      {
        title: 'Failed',
        description: (
          <EuiTextColor color={aggregations.failed ? 'danger' : 'default'}>
            {aggregations.failed}
          </EuiTextColor>
        ),
      },
    ],
    [agentIds, aggregations.failed, aggregations.successful, notRespondedCount]
  );

  const renderRowsColumn = useCallback(
    (_, item) => {
      if (!logsResults) return '-';
      const agentId = item.fields.agent_id[0];

      console.error(
        'agentId',
        agentId,
        logsResults?.rawResponse?.aggregations?.count_by_agent_id?.buckets
      );

      return (
        logsResults?.rawResponse?.aggregations?.count_by_agent_id?.buckets?.find(
          (bucket) => bucket.key === agentId
        )?.doc_count ?? '-'
      );
    },
    [logsResults]
  );

  const columns = useMemo(
    () => [
      {
        field: 'fields.completed_at[0]',
        name: 'Status',
        sortable: true,
        // eslint-disable-next-line react/display-name
        render: (value, item) => {
          console.error('item', item);
          if (!value) return 'pending';
          if (item.fields['error.keyword']) return 'error';
          return <>{'success'}</>;
        },
      },
      {
        field: 'fields.agent_id[0]',
        name: 'Agent ID',
      },
      {
        field: 'fields.rows[0]',
        name: '# rows',
        render: renderRowsColumn,
      },
      {
        field: 'fields.error[0]',
        name: 'Error',
        render: renderErrorMessage,
      },
    ],
    [renderRowsColumn]
  );

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
      totalItemCount: totalCount ?? 0,
      pageSizeOptions: [10, 20, 50],
    }),
    [totalCount, pageIndex, pageSize]
  );

  const onTableChange = useCallback(({ page = {} }) => {
    const { index, size } = page;

    setPageIndex(index);
    setPageSize(size);
  }, []);

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiCard title="" description="" textAlign="left">
            <EuiDescriptionList
              compressed
              textStyle="reverse"
              type="responsiveColumn"
              listItems={listItems}
            />
          </EuiCard>
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
