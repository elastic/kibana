/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn, EuiTableActionsColumnType } from '@elastic/eui';
import { EuiButtonIcon } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiText,
  EuiPopover,
  EuiInMemoryTable,
  EuiLink,
  EuiToolTip,
  EuiSkeletonText,
} from '@elastic/eui';
import moment from 'moment-timezone';
import React, { useCallback, useMemo, useState } from 'react';

import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import { useKibana, useRouterNavigate } from '../common/lib/kibana';
import { usePacks } from './use_packs';
import { ActiveStateSwitch } from './active_state_switch';
import { AgentsPolicyLink } from '../agent_policies/agents_policy_link';
import type { PackSavedObject } from './types';

const updatedAtCss = {
  whiteSpace: 'nowrap' as const,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const EMPTY_ARRAY: PackSavedObject[] = [];

const ScheduledQueryNameComponent = ({ id, name }: { id: string; name: string }) => (
  <EuiLink {...useRouterNavigate(`packs/${id}`)}>{name}</EuiLink>
);

const ScheduledQueryName = React.memo(ScheduledQueryNameComponent);

const renderName = (_: unknown, item: PackSavedObject) => (
  <ScheduledQueryName id={item.saved_object_id} name={item.name} />
);

export const AgentPoliciesPopover = ({ agentPolicyIds = [] }: { agentPolicyIds?: string[] }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onButtonClick = useCallback(
    () => setIsPopoverOpen((currentIsPopoverOpen) => !currentIsPopoverOpen),
    []
  );
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const button = useMemo(
    () => (
      <EuiButtonEmpty size="s" flush="both" onClick={onButtonClick}>
        <>{agentPolicyIds?.length ?? 0}</>
      </EuiButtonEmpty>
    ),
    [agentPolicyIds?.length, onButtonClick]
  );

  if (!agentPolicyIds?.length) {
    return <>{agentPolicyIds?.length ?? 0}</>;
  }

  return (
    <EuiPopover button={button} isOpen={isPopoverOpen} closePopover={closePopover}>
      <EuiText size="s">
        {agentPolicyIds?.map((policyId) => (
          <div key={policyId}>
            <AgentsPolicyLink policyId={policyId} />
          </div>
        ))}
      </EuiText>
    </EuiPopover>
  );
};

const PacksTableComponent = () => {
  const permissions = useKibana().services.application.capabilities.osquery;
  const { push } = useHistory();
  const { data, isLoading } = usePacks({});

  const renderAgentPolicy = useCallback(
    (agentPolicyIds) => <AgentPoliciesPopover agentPolicyIds={agentPolicyIds} />,
    []
  );

  const renderQueries = useCallback(
    (queries) => <>{(queries && Object.keys(queries).length) ?? 0}</>,
    []
  );

  const renderActive = useCallback((_, item) => <ActiveStateSwitch item={item} />, []);

  const renderUpdatedAt = useCallback((updatedAt, item) => {
    if (!updatedAt) return '-';

    const updatedBy = item.updated_by !== item.created_by ? ` @ ${item.updated_by}` : '';

    return updatedAt ? (
      <EuiToolTip content={`${moment(updatedAt).fromNow()}${updatedBy}`}>
        <span css={updatedAtCss}>{`${moment(updatedAt).fromNow()}${updatedBy}`}</span>
      </EuiToolTip>
    ) : (
      '-'
    );
  }, []);

  const handlePlayClick = useCallback<(item: PackSavedObject) => () => void>(
    (item) => () =>
      push('/live_queries/new', {
        form: {
          packId: item.saved_object_id,
        },
      }),
    [push]
  );

  const renderPlayAction = useCallback(
    (item, enabled) => {
      const playText = i18n.translate('xpack.osquery.packs.table.runActionAriaLabel', {
        defaultMessage: 'Run {packName}',
        values: {
          packName: item.name,
        },
      });

      return (
        <EuiToolTip position="top" content={playText}>
          <EuiButtonIcon
            iconType="play"
            onClick={handlePlayClick(item)}
            isDisabled={!enabled}
            data-test-subj={`play-${item.name}-button`}
          />
        </EuiToolTip>
      );
    },
    [handlePlayClick]
  );

  const columns: Array<EuiBasicTableColumn<PackSavedObject>> = useMemo(
    () => [
      {
        field: 'name',
        name: i18n.translate('xpack.osquery.packs.table.nameColumnTitle', {
          defaultMessage: 'Name',
        }),
        sortable: (item) => item.name.toLowerCase(),
        render: renderName,
      },
      {
        field: 'policy_ids',
        name: i18n.translate('xpack.osquery.packs.table.policyColumnTitle', {
          defaultMessage: 'Scheduled policies',
        }),
        truncateText: true,
        render: renderAgentPolicy,
      },
      {
        field: 'queries',
        name: i18n.translate('xpack.osquery.packs.table.numberOfQueriesColumnTitle', {
          defaultMessage: 'Number of queries',
        }),
        render: renderQueries,
        width: '150px',
      },
      {
        field: 'created_by',
        name: i18n.translate('xpack.osquery.packs.table.createdByColumnTitle', {
          defaultMessage: 'Created by',
        }),
        sortable: true,
        truncateText: true,
      },
      {
        field: 'updated_at',
        name: 'Last updated',
        sortable: (item) => (item.updated_at ? Date.parse(item.updated_at) : 0),
        truncateText: true,
        render: renderUpdatedAt,
      },
      {
        field: 'enabled',
        name: i18n.translate('xpack.osquery.packs.table.activeColumnTitle', {
          defaultMessage: 'Active',
        }),
        sortable: true,
        align: 'right',
        width: '80px',
        render: renderActive,
      },
      {
        name: i18n.translate('xpack.osquery.pack.queriesTable.actionsColumnTitle', {
          defaultMessage: 'Actions',
        }),
        width: '80px',
        actions: [
          {
            render: renderPlayAction,
            enabled: () => permissions.writeLiveQueries || permissions.runSavedQueries,
          },
        ],
      } as EuiTableActionsColumnType<PackSavedObject>,
    ],
    [
      permissions.runSavedQueries,
      permissions.writeLiveQueries,
      renderActive,
      renderAgentPolicy,
      renderPlayAction,
      renderQueries,
      renderUpdatedAt,
    ]
  );

  const sorting = useMemo(
    () => ({
      sort: {
        field: 'name',
        direction: 'asc' as const,
      },
    }),
    []
  );

  if (isLoading) {
    return <EuiSkeletonText lines={10} />;
  }

  return (
    <EuiInMemoryTable<PackSavedObject>
      items={data?.data ?? EMPTY_ARRAY}
      columns={columns}
      pagination={true}
      sorting={sorting}
    />
  );
};

export const PacksTable = React.memo(PacksTableComponent);
