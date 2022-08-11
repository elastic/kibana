/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { orderBy } from 'lodash';
import React, { useCallback, useMemo, useState } from 'react';
import { ValuesType } from 'utility-types';
import { AgentIcon } from '../../../shared/agent_icon';
import { APIReturnType } from '../../../../services/rest/create_call_apm_api';
import { unit } from '../../../../utils/style';
import { EnvironmentBadge } from '../../../shared/environment_badge';
import { TruncateWithTooltip } from '../../../shared/truncate_with_tooltip';

type ServiceListAPIResponse =
  APIReturnType<'GET /internal/apm/service-group/services'>;
type Items = ServiceListAPIResponse['items'];
type ServiceListItem = ValuesType<Items>;

interface Props {
  items: Items;
  isLoading: boolean;
}

const DEFAULT_SORT_FIELD = 'serviceName';
const DEFAULT_SORT_DIRECTION = 'asc';
type DIRECTION = 'asc' | 'desc';
type SORT_FIELD = 'serviceName' | 'environments' | 'agentName';

export function ServiceListPreview({ items, isLoading }: Props) {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [sortField, setSortField] = useState<SORT_FIELD>(DEFAULT_SORT_FIELD);
  const [sortDirection, setSortDirection] = useState<DIRECTION>(
    DEFAULT_SORT_DIRECTION
  );

  const onTableChange = useCallback(
    (options: {
      page: { index: number; size: number };
      sort?: { field: SORT_FIELD; direction: DIRECTION };
    }) => {
      setPageIndex(options.page.index);
      setPageSize(options.page.size);
      setSortField(options.sort?.field || DEFAULT_SORT_FIELD);
      setSortDirection(options.sort?.direction || DEFAULT_SORT_DIRECTION);
    },
    []
  );

  const sort = useMemo(() => {
    return {
      sort: { field: sortField, direction: sortDirection },
    };
  }, [sortField, sortDirection]);

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
      totalItemCount: items.length,
      hidePerPageOptions: true,
    }),
    [pageIndex, pageSize, items.length]
  );

  const renderedItems = useMemo(() => {
    const sortedItems = orderBy(items, sortField, sortDirection);

    return sortedItems.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  }, [pageIndex, pageSize, sortField, sortDirection, items]);

  const columns: Array<EuiBasicTableColumn<ServiceListItem>> = [
    {
      field: 'serviceName',
      name: i18n.translate(
        'xpack.apm.serviceGroups.selectServicesList.nameColumnLabel',
        { defaultMessage: 'Name' }
      ),
      sortable: true,
      render: (_, { serviceName, agentName }) => (
        <TruncateWithTooltip
          data-test-subj="apmServiceListAppLink"
          text={serviceName}
          content={
            <EuiFlexGroup gutterSize="s" justifyContent="flexStart">
              <EuiFlexItem grow={false}>
                <AgentIcon agentName={agentName} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>{serviceName}</EuiFlexItem>
            </EuiFlexGroup>
          }
        />
      ),
    },
    {
      field: 'environments',
      name: i18n.translate(
        'xpack.apm.serviceGroups.selectServicesList.environmentColumnLabel',
        { defaultMessage: 'Environments' }
      ),
      width: `${unit * 10}px`,
      sortable: true,
      render: (_, { environments }) => (
        <EnvironmentBadge environments={environments ?? []} />
      ),
    },
  ];

  return (
    <EuiBasicTable
      loading={isLoading}
      noItemsMessage={i18n.translate(
        'xpack.apm.serviceGroups.selectServicesList.notFoundLabel',
        {
          defaultMessage:
            'No services available within the last 24 hours. You can still create the group and services that match your query will be added.',
        }
      )}
      items={renderedItems}
      columns={columns}
      sorting={sort}
      onChange={onTableChange}
      pagination={pagination}
    />
  );
}
