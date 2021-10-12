/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiInMemoryTable, EuiBasicTableColumn, EuiLink, EuiToolTip } from '@elastic/eui';
import moment from 'moment-timezone';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { i18n } from '@kbn/i18n';
import { PackagePolicy } from '../../../fleet/common';
import { useRouterNavigate } from '../common/lib/kibana';
import { usePacks } from './use_packs';
import { ActiveStateSwitch } from './active_state_switch';

const UpdatedBy = styled.span`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ScheduledQueryNameComponent = ({ id, name }: { id: string; name: string }) => (
  <EuiLink {...useRouterNavigate(`packs/${id}`)}>{name}</EuiLink>
);

const ScheduledQueryName = React.memo(ScheduledQueryNameComponent);

const renderName = (_: unknown, item: { id: string; attributes: { name: string } }) => (
  <ScheduledQueryName id={item.id} name={item.attributes.name} />
);

const PacksTableComponent = () => {
  const { data } = usePacks({});

  const renderAgentPolicy = useCallback((policyIds) => <>{policyIds?.length ?? 0}</>, []);

  const renderQueries = useCallback(
    (queries) => <>{(queries && Object.keys(queries).length) ?? 0}</>,
    []
  );

  const renderActive = useCallback((_, item) => <ActiveStateSwitch item={item} />, []);

  const renderUpdatedAt = useCallback((updatedAt, item) => {
    if (!updatedAt) return '-';

    const updatedBy =
      item.attributes.updated_by !== item.attributes.created_by
        ? ` @ ${item.attributes.updated_by}`
        : '';
    return updatedAt ? (
      <EuiToolTip content={`${moment(updatedAt).fromNow()}${updatedBy}`}>
        <UpdatedBy>{`${moment(updatedAt).fromNow()}${updatedBy}`}</UpdatedBy>
      </EuiToolTip>
    ) : (
      '-'
    );
  }, []);

  // @ts-expect-error update types
  const columns: Array<EuiBasicTableColumn<PackagePolicy>> = useMemo(
    () => [
      {
        field: 'attributes.name',
        name: i18n.translate('xpack.osquery.packs.table.nameColumnTitle', {
          defaultMessage: 'Name',
        }),
        sortable: true,
        render: renderName,
      },
      {
        field: 'policy_ids',
        name: i18n.translate('xpack.osquery.packs.table.policyColumnTitle', {
          defaultMessage: 'Policies',
        }),
        truncateText: true,
        render: renderAgentPolicy,
      },
      {
        field: 'attributes.queries',
        name: i18n.translate('xpack.osquery.packs.table.numberOfQueriesColumnTitle', {
          defaultMessage: 'Number of queries',
        }),
        render: renderQueries,
        width: '150px',
      },
      {
        field: 'attributes.created_by',
        name: i18n.translate('xpack.osquery.packs.table.createdByColumnTitle', {
          defaultMessage: 'Created by',
        }),
        sortable: true,
        truncateText: true,
      },
      {
        field: 'attributes.updated_at',
        name: 'Last updated',
        sortable: (item) => (item.updated_at ? Date.parse(item.updated_at) : 0),
        truncateText: true,
        render: renderUpdatedAt,
      },
      {
        field: 'attributes.enabled',
        name: i18n.translate('xpack.osquery.packs.table.activeColumnTitle', {
          defaultMessage: 'Active',
        }),
        sortable: true,
        align: 'right',
        width: '80px',
        render: renderActive,
      },
    ],
    [renderActive, renderAgentPolicy, renderQueries, renderUpdatedAt]
  );

  const sorting = useMemo(
    () => ({
      sort: {
        field: 'attributes.name',
        direction: 'asc' as const,
      },
    }),
    []
  );

  return (
    <EuiInMemoryTable<PackagePolicy>
      // eslint-disable-next-line react-perf/jsx-no-new-array-as-prop
      items={data?.saved_objects ?? []}
      columns={columns}
      pagination={true}
      sorting={sorting}
    />
  );
};

export const PacksTable = React.memo(PacksTableComponent);
