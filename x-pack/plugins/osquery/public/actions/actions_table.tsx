/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTable, EuiCodeBlock, formatDate } from '@elastic/eui';
import React, { createContext, useState, useCallback, useMemo } from 'react';

import { useAllActions } from './use_all_actions';
import { ActionEdges, Direction } from '../../common/search_strategy';
import { useRouterNavigate } from '../common/lib/kibana';

const ActionsTableComponent = () => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const { isLoading: actionsLoading, data: actionsData } = useAllActions({
    activePage: pageIndex,
    limit: pageSize,
    direction: Direction.desc,
    sortField: '@timestamp',
  });

  const onTableChange = useCallback(({ page = {} }) => {
    const { index, size } = page;

    setPageIndex(index);
    setPageSize(size);
  }, []);

  const renderQueryColumn = useCallback(
    (_, item) => (
      <EuiCodeBlock language="sql" fontSize="s" paddingSize="none" transparentBackground>
        {item._source.data.query}
      </EuiCodeBlock>
    ),
    []
  );

  const renderAgentsColumn = useCallback((_, item) => <>{item.fields.agents.length}</>, []);

  const renderTimestampColumn = useCallback(
    (_, item) => <>{formatDate(item.fields['@timestamp'][0])}</>,
    []
  );

  const columns = useMemo(
    () => [
      {
        field: 'query',
        name: 'Query',
        truncateText: true,
        render: renderQueryColumn,
      },
      {
        field: 'agents',
        name: 'Agents',
        width: '100px',
        render: renderAgentsColumn,
      },
      {
        field: 'created_at',
        name: 'Created at',
        width: '200px',
        render: renderTimestampColumn,
      },
      {
        name: 'Actions',
        actions: [
          {
            name: 'Results',
            description: 'See action deta',
            type: 'icon',
            icon: 'copy',
            onClick: () => '',
          },
        ],
      },
    ],
    [renderAgentsColumn, renderQueryColumn, renderTimestampColumn]
  );

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
      totalItemCount: actionsData?.totalCount,
      pageSizeOptions: [20, 50, 100],
    }),
    [actionsData?.totalCount, pageIndex, pageSize]
  );

  return (
    <EuiBasicTable
      // eslint-disable-next-line react-perf/jsx-no-new-array-as-prop
      items={actionsData?.actions ?? []}
      // @ts-expect-error update types
      columns={columns}
      // @ts-expect-error update types
      pagination={pagination}
      onChange={onTableChange}
    />
  );
};

export const ActionsTable = React.memo(ActionsTableComponent);
