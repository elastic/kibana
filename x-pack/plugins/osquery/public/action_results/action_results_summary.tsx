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
  EuiBasicTable,
  EuiCodeBlock,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';

import { useActionResults } from './use_action_results';
import { Direction } from '../../common/search_strategy';

interface ActionResultsSummaryProps {
  actionId: string;
  agentsCount?: number;
  isLive?: boolean;
}

const renderErrorMessage = (error: string) => (
  <EuiCodeBlock language="sql" fontSize="s" paddingSize="none" transparentBackground>
    {error}
  </EuiCodeBlock>
);

const ActionResultsSummaryComponent: React.FC<ActionResultsSummaryProps> = ({
  actionId,
  agentsCount,
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
    limit: pageSize,
    direction: Direction.asc,
    sortField: '@timestamp',
    isLive,
  });

  const notRespondedCount = useMemo(() => {
    if (!agentsCount || !aggregations.totalResponded) {
      return '-';
    }

    return agentsCount - aggregations.totalResponded;
  }, [aggregations.totalResponded, agentsCount]);

  const listItems = useMemo(
    () => [
      {
        title: 'Agents queried',
        description: agentsCount,
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
    [agentsCount, aggregations.failed, aggregations.successful, notRespondedCount]
  );

  const columns = useMemo(
    () => [
      {
        field: 'fields.agent_id[0]',
        name: 'Agent ID',
        truncateText: true,
      },
      {
        field: 'fields.error[0]',
        name: 'Error',
        render: renderErrorMessage,
      },
    ],
    []
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
          <EuiBasicTable
            items={edges}
            columns={columns}
            pagination={pagination}
            onChange={onTableChange}
          />
        </>
      ) : null}
    </>
  );
};

export const ActionResultsSummary = React.memo(ActionResultsSummaryComponent);
