/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiLink,
  EuiBasicTable,
  type EuiBasicTableColumn,
  type EuiBasicTableProps,
  type Pagination,
  type CriteriaWithPagination,
} from '@elastic/eui';
import React from 'react';
import moment from 'moment';
import { Link, useHistory } from 'react-router-dom';
import { TABLE_COLUMN_HEADERS } from './translations';
import type { Benchmark } from '../../../common/types';
import { pagePathGetters } from '../../../../fleet/public';
import { useKibana } from '../../common/hooks/use_kibana';

interface BenchmarksTableProps
  extends Pick<EuiBasicTableProps<Benchmark>, 'loading' | 'error' | 'noItemsMessage'>,
    Pagination {
  benchmarks: Benchmark[];
  setQuery(pagination: CriteriaWithPagination<Benchmark>): void;
  'data-test-subj'?: string;
}

const AgentPolicyButtonLink = ({ name, id: policyId }: { name: string; id: string }) => {
  const { http } = useKibana().services;
  return (
    <EuiLink
      href={http.basePath.prepend(pagePathGetters.policy_details({ policyId }).join(''))}
      title={name}
    >
      {name}
    </EuiLink>
  );
};

const BENCHMARKS_TABLE_COLUMNS: Array<EuiBasicTableColumn<Benchmark>> = [
  {
    field: 'package_policy.name',
    name: TABLE_COLUMN_HEADERS.BENCHMARK_RULES,
    render: (v, r) => (
      <Link to={`/benchmark/${r.package_policy.id}/${r.package_policy.policy_id}/rules`} title={v}>
        {v}
      </Link>
    ),
    truncateText: true,
  },
  {
    field: 'package_policy.rules', // TODO: add fields
    name: TABLE_COLUMN_HEADERS.ACTIVE_RULES,
    truncateText: true,
    // render: (benchmarkIntegration) =>
    //   `${benchmarkIntegration.rules.active} of ${benchmarkIntegration.rules.total}`,
  },
  {
    field: 'package_policy.package.title',
    name: TABLE_COLUMN_HEADERS.BENCHMARK,
    dataType: 'string',
    truncateText: true,
  },

  {
    field: 'agent_policy.name',
    name: TABLE_COLUMN_HEADERS.AGENT_POLICY,
    render: (v, r) => <AgentPolicyButtonLink name={v} id={r.agent_policy.id} />,
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
  },

  {
    field: 'package_policy.created_at',
    name: TABLE_COLUMN_HEADERS.CREATED_AT,
    dataType: 'date',
    truncateText: true,
    render: (date: Benchmark['package_policy']['created_at']) => moment(date).fromNow(),
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
  ...rest
}: BenchmarksTableProps) => {
  const history = useHistory();

  const getRowProps: EuiBasicTableProps<Benchmark>['rowProps'] = (item) => ({
    onClick: (evt: MouseEvent) =>
      // Navigate to rules page unless we already clicked a link
      !(evt.target instanceof HTMLAnchorElement) &&
      history.push(`/benchmark/${item.package_policy.id}/${item.package_policy.policy_id}/rules`),
  });

  const pagination: Pagination = {
    pageIndex: Math.max(pageIndex - 1, 0),
    pageSize,
    totalItemCount,
  };

  const onChange = ({ page }: CriteriaWithPagination<Benchmark>) => {
    if (!page) return;
    setQuery({ page: { ...page, index: page.index + 1 } });
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
    />
  );
};
