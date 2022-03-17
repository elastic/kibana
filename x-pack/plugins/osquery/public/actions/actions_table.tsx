/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArray, isEmpty, pickBy } from 'lodash';
import { i18n } from '@kbn/i18n';
import { EuiBasicTable, EuiButtonIcon, EuiCodeBlock, formatDate } from '@elastic/eui';
import React, { useState, useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';

import { useAllActions } from './use_all_actions';
import { Direction } from '../../common/search_strategy';
import { useRouterNavigate } from '../common/lib/kibana';

interface ActionTableResultsButtonProps {
  actionId: string;
}

const ActionTableResultsButton: React.FC<ActionTableResultsButtonProps> = ({ actionId }) => {
  const navProps = useRouterNavigate(`live_queries/${actionId}`);

  return <EuiButtonIcon iconType="visTable" {...navProps} />;
};

ActionTableResultsButton.displayName = 'ActionTableResultsButton';

const ActionsTableComponent = () => {
  const { push } = useHistory();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const { data: actionsData } = useAllActions({
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

  const renderAgentsColumn = useCallback((_, item) => <>{item.fields.agents?.length ?? 0}</>, []);

  const renderCreatedByColumn = useCallback((userId) => (isArray(userId) ? userId[0] : '-'), []);

  const renderTimestampColumn = useCallback(
    (_, item) => <>{formatDate(item.fields['@timestamp'][0])}</>,
    []
  );

  const renderActionsColumn = useCallback(
    (item) => <ActionTableResultsButton actionId={item.fields.action_id[0]} />,
    []
  );

  const handlePlayClick = useCallback(
    (item) =>
      push('/live_queries/new', {
        form: pickBy(
          {
            agentIds: item.fields.agents,
            query: item._source.data.query,
            ecs_mapping: item._source.data.ecs_mapping,
            savedQueryId: item._source.data.saved_query_id,
          },
          (value) => !isEmpty(value)
        ),
      }),
    [push]
  );

  const columns = useMemo(
    () => [
      {
        field: 'query',
        name: i18n.translate('xpack.osquery.liveQueryActions.table.queryColumnTitle', {
          defaultMessage: 'Query',
        }),
        truncateText: true,
        render: renderQueryColumn,
      },
      {
        field: 'agents',
        name: i18n.translate('xpack.osquery.liveQueryActions.table.agentsColumnTitle', {
          defaultMessage: 'Agents',
        }),
        width: '100px',
        render: renderAgentsColumn,
      },
      {
        field: 'created_at',
        name: i18n.translate('xpack.osquery.liveQueryActions.table.createdAtColumnTitle', {
          defaultMessage: 'Created at',
        }),
        width: '200px',
        render: renderTimestampColumn,
      },
      {
        field: 'fields.user_id',
        name: i18n.translate('xpack.osquery.liveQueryActions.table.createdByColumnTitle', {
          defaultMessage: 'Run by',
        }),
        width: '200px',
        render: renderCreatedByColumn,
      },
      {
        name: i18n.translate('xpack.osquery.liveQueryActions.table.viewDetailsColumnTitle', {
          defaultMessage: 'View details',
        }),
        actions: [
          {
            type: 'icon',
            icon: 'play',
            onClick: handlePlayClick,
          },
          {
            render: renderActionsColumn,
          },
        ],
      },
    ],
    [
      handlePlayClick,
      renderActionsColumn,
      renderAgentsColumn,
      renderCreatedByColumn,
      renderQueryColumn,
      renderTimestampColumn,
    ]
  );

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
      totalItemCount: actionsData?.totalCount ?? 0,
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
      pagination={pagination}
      onChange={onTableChange}
    />
  );
};

export const ActionsTable = React.memo(ActionsTableComponent);
