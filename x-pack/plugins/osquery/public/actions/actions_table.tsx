/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArray, isEmpty, pickBy, map } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  EuiBasicTable,
  EuiButtonIcon,
  EuiCodeBlock,
  formatDate,
  EuiIcon,
  EuiFlexItem,
  EuiFlexGroup,
  EuiToolTip,
} from '@elastic/eui';
import React, { useState, useCallback, useMemo } from 'react';
import { useHistory } from 'react-router-dom';

import { useAllLiveQueries } from './use_all_live_queries';
import type { SearchHit } from '../../common/search_strategy';
import { Direction } from '../../common/search_strategy';
import { useRouterNavigate, useKibana } from '../common/lib/kibana';
import { usePacks } from '../packs/use_packs';

const EMPTY_ARRAY: SearchHit[] = [];

interface ActionTableResultsButtonProps {
  actionId: string;
}

const ActionTableResultsButton: React.FC<ActionTableResultsButtonProps> = ({ actionId }) => {
  const navProps = useRouterNavigate(`live_queries/${actionId}`);

  const detailsText = i18n.translate(
    'xpack.osquery.liveQueryActions.table.viewDetailsActionButton',
    {
      defaultMessage: 'Details',
    }
  );

  return (
    <EuiToolTip position="top" content={detailsText}>
      <EuiButtonIcon iconType="visTable" {...navProps} aria-label={detailsText} />
    </EuiToolTip>
  );
};

ActionTableResultsButton.displayName = 'ActionTableResultsButton';

const ActionsTableComponent = () => {
  const permissions = useKibana().services.application.capabilities.osquery;
  const { push } = useHistory();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const { data: packsData } = usePacks({});

  const { data: actionsData } = useAllLiveQueries({
    activePage: pageIndex,
    limit: pageSize,
    direction: Direction.desc,
    sortField: '@timestamp',
    filterQuery: {
      exists: {
        field: 'user_id',
      },
    },
  });

  const onTableChange = useCallback(({ page = {} }) => {
    const { index, size } = page;

    setPageIndex(index);
    setPageSize(size);
  }, []);

  const renderQueryColumn = useCallback((_, item) => {
    if (item._source.pack_name) {
      return (
        <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="package" />
          </EuiFlexItem>
          <EuiFlexItem>{item._source.pack_name}</EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    return (
      <EuiCodeBlock language="sql" fontSize="s" paddingSize="none" transparentBackground>
        {item._source.queries[0].query}
      </EuiCodeBlock>
    );
  }, []);

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
    (item) => () => {
      const packId = item._source.pack_id;

      if (packId) {
        return push('/live_queries/new', {
          form: pickBy(
            {
              packId: item._source.pack_id,
              agentSelection: {
                agents: item._source.agent_ids,
                allAgentsSelected: item._source.agent_all,
                platformsSelected: item._source.agent_platforms,
                policiesSelected: item._source.agent_policy_ids,
              },
            },
            (value) => !isEmpty(value)
          ),
        });
      }

      push('/live_queries/new', {
        form: pickBy(
          {
            query: item._source.queries[0].query,
            ecs_mapping: item._source.queries[0].ecs_mapping,
            savedQueryId: item._source.queries[0].saved_query_id,
            agentSelection: {
              agents: item._source.agent_ids,
              allAgentsSelected: item._source.agent_all,
              platformsSelected: item._source.agent_platforms,
              policiesSelected: item._source.agent_policy_ids,
            },
          },
          (value) => !isEmpty(value)
        ),
      });
    },
    [push]
  );
  const renderPlayButton = useCallback(
    (item, enabled) => {
      const playText = i18n.translate('xpack.osquery.liveQueryActions.table.runActionAriaLabel', {
        defaultMessage: 'Run query',
      });

      return (
        <EuiToolTip position="top" content={playText}>
          <EuiButtonIcon
            iconType="play"
            onClick={handlePlayClick(item)}
            isDisabled={!enabled}
            aria-label={playText}
          />
        </EuiToolTip>
      );
    },
    [handlePlayClick]
  );

  const existingPackIds = useMemo(() => map(packsData?.data ?? [], 'id'), [packsData]);

  const isPlayButtonAvailable = useCallback(
    (item) => {
      if (item.fields.pack_id?.length) {
        return (
          existingPackIds.includes(item.fields.pack_id[0]) &&
          permissions.runSavedQueries &&
          permissions.readPacks
        );
      }

      return !!(permissions.runSavedQueries || permissions.writeLiveQueries);
    },
    [permissions, existingPackIds]
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
            available: isPlayButtonAvailable,
            render: renderPlayButton,
          },
          {
            render: renderActionsColumn,
          },
        ],
      },
    ],
    [
      isPlayButtonAvailable,
      renderActionsColumn,
      renderAgentsColumn,
      renderCreatedByColumn,
      renderPlayButton,
      renderQueryColumn,
      renderTimestampColumn,
    ]
  );

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
      totalItemCount: actionsData?.data?.total ?? 0,
      pageSizeOptions: [20, 50, 100],
    }),
    [actionsData, pageIndex, pageSize]
  );

  return (
    <EuiBasicTable
      items={actionsData?.data?.items ?? EMPTY_ARRAY}
      // @ts-expect-error update types
      columns={columns}
      pagination={pagination}
      onChange={onTableChange}
    />
  );
};

export const ActionsTable = React.memo(ActionsTableComponent);
