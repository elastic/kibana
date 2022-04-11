/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  type EuiBasicTableColumn,
  type EuiBasicTableProps,
  type Pagination,
  type CriteriaWithPagination,
} from '@elastic/eui';
import React from 'react';
import moment from 'moment';
import { Link, useHistory, generatePath } from 'react-router-dom';
import { TABLE_COLUMN_HEADERS } from './translations';
import type { Benchmark } from '../../../common/types';
import { pagePathGetters } from '../../../../fleet/public';
import { useKibana } from '../../common/hooks/use_kibana';
import { allNavigationItems } from '../../common/navigation/constants';

interface BenchmarksTableProps
  extends Pick<EuiBasicTableProps<Benchmark>, 'loading' | 'error' | 'noItemsMessage' | 'sorting'>,
    Pagination {
  benchmarks: Benchmark[];
  setQuery(pagination: CriteriaWithPagination<Benchmark>): void;
  'data-test-subj'?: string;
}

const AgentPolicyButtonLink = ({ name, id: policyId }: { name: string; id: string }) => {
  const { http, application } = useKibana().services;
  const [fleetBase, path] = pagePathGetters.policy_details({ policyId });
  return (
    <a
      href={http.basePath.prepend([fleetBase, path].join(''))}
      title={name}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        application.navigateToApp('fleet', { path });
      }}
    >
      {name}
    </a>
  );
};

const BENCHMARKS_TABLE_COLUMNS: Array<EuiBasicTableColumn<Benchmark>> = [
  {
    field: 'package_policy.name',
    name: TABLE_COLUMN_HEADERS.INTEGRATION,
    render: (packageName, benchmark) => (
      <Link
        to={generatePath(allNavigationItems.rules.path, {
          packagePolicyId: benchmark.package_policy.id,
          policyId: benchmark.package_policy.policy_id,
        })}
        title={packageName}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {packageName}
      </Link>
    ),
    truncateText: true,
    sortable: true,
  },
  {
    field: 'package_policy.package.title',
    name: TABLE_COLUMN_HEADERS.INTEGRATION_TYPE,
    dataType: 'string',
    truncateText: true,
    sortable: true,
  },
  {
    field: 'agent_policy.name',
    name: TABLE_COLUMN_HEADERS.AGENT_POLICY,
    render: (name, benchmark) => (
      <AgentPolicyButtonLink name={name} id={benchmark.agent_policy.id} />
    ),
    truncateText: true,
  },
  {
    field: 'agent_policy.agents',
    name: TABLE_COLUMN_HEADERS.NUMBER_OF_AGENTS,
    truncateText: true,
  },
  {
    field: 'package_policy.created_by',
    name: TABLE_COLUMN_HEADERS.CREATED_BY,
    dataType: 'string',
    truncateText: true,
    sortable: true,
  },
  {
    field: 'package_policy.created_at',
    name: TABLE_COLUMN_HEADERS.CREATED_AT,
    dataType: 'date',
    truncateText: true,
    render: (date: Benchmark['package_policy']['created_at']) => moment(date).fromNow(),
    sortable: true,
  },
  {
    field: 'package_policy.rules', // TODO: add fields
    name: TABLE_COLUMN_HEADERS.ACTIVE_RULES,
    truncateText: true,
    // render: (benchmarkIntegration) =>
    //   `${benchmarkIntegration.rules.active} of ${benchmarkIntegration.rules.total}`,
  },
];

export const BenchmarksTable = ({
  benchmarks,
  pageIndex,
  pageSize,
  totalItemCount,
  loading,
  error,
  setQuery,
  noItemsMessage,
  sorting,
  ...rest
}: BenchmarksTableProps) => {
  const history = useHistory();

  const getRowProps: EuiBasicTableProps<Benchmark>['rowProps'] = (benchmark) => ({
    onClick: () =>
      history.push(
        generatePath(allNavigationItems.rules.path, {
          packagePolicyId: benchmark.package_policy.id,
          policyId: benchmark.package_policy.policy_id,
        })
      ),
  });

  const pagination: Pagination = {
    pageIndex: Math.max(pageIndex - 1, 0),
    pageSize,
    totalItemCount,
  };

  const onChange = ({ page, sort }: CriteriaWithPagination<Benchmark>) => {
    setQuery({ page: { ...page, index: page.index + 1 }, sort });
  };

  return (
    <EuiBasicTable
      data-test-subj={rest['data-test-subj']}
      items={benchmarks}
      columns={BENCHMARKS_TABLE_COLUMNS}
      rowProps={getRowProps}
      itemId={(item) => [item.agent_policy.id, item.package_policy.id].join('/')}
      pagination={pagination}
      onChange={onChange}
      tableLayout="fixed"
      loading={loading}
      noItemsMessage={noItemsMessage}
      error={error}
      sorting={sorting}
    />
  );
};
