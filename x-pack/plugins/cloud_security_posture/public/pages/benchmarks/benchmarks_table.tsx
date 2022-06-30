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
import { pagePathGetters } from '@kbn/fleet-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { Benchmark } from '../../../common/types';
import { useKibana } from '../../common/hooks/use_kibana';
import { allNavigationItems } from '../../common/navigation/constants';
import * as TEST_SUBJ from './test_subjects';

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
    name: i18n.translate('xpack.csp.benchmarks.benchmarksTable.integrationColumnTitle', {
      defaultMessage: 'Integration',
    }),
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
    'data-test-subj': TEST_SUBJ.BENCHMARKS_TABLE_COLUMNS.INTEGRATION,
  },
  {
    field: 'rules',
    name: i18n.translate('xpack.csp.benchmarks.benchmarksTable.activeRulesColumnTitle', {
      defaultMessage: 'Active Rules',
    }),
    truncateText: true,
    render: ({ enabled, all }: Benchmark['rules']) => (
      <FormattedMessage
        id="xpack.csp.benchmark.benchmarkTable.activeRulesColumnRenderTitle"
        defaultMessage="{enabled} of {all}"
        values={{ enabled, all }}
      />
    ),
    'data-test-subj': TEST_SUBJ.BENCHMARKS_TABLE_COLUMNS.ACTIVE_RULES,
  },
  {
    field: 'package_policy.package.title',
    name: i18n.translate('xpack.csp.benchmarks.benchmarksTable.integrationTypeColumnTitle', {
      defaultMessage: 'Integration Type',
    }),
    dataType: 'string',
    truncateText: true,
    sortable: true,
    'data-test-subj': TEST_SUBJ.BENCHMARKS_TABLE_COLUMNS.INTEGRATION_TYPE,
  },
  {
    field: 'agent_policy.name',
    name: i18n.translate('xpack.csp.benchmarks.benchmarksTable.agentPolicyColumnTitle', {
      defaultMessage: 'Agent Policy',
    }),
    render: (name, benchmark) => (
      <AgentPolicyButtonLink name={name} id={benchmark.agent_policy.id} />
    ),
    truncateText: true,
    'data-test-subj': TEST_SUBJ.BENCHMARKS_TABLE_COLUMNS.AGENT_POLICY,
  },
  {
    field: 'agent_policy.agents',
    name: i18n.translate('xpack.csp.benchmarks.benchmarksTable.numberOfAgentsColumnTitle', {
      defaultMessage: 'Number of Agents',
    }),
    truncateText: true,
    'data-test-subj': TEST_SUBJ.BENCHMARKS_TABLE_COLUMNS.NUMBER_OF_AGENTS,
  },
  {
    field: 'package_policy.created_by',
    name: i18n.translate('xpack.csp.benchmarks.benchmarksTable.createdByColumnTitle', {
      defaultMessage: 'Created by',
    }),
    dataType: 'string',
    truncateText: true,
    sortable: true,
    'data-test-subj': TEST_SUBJ.BENCHMARKS_TABLE_COLUMNS.CREATED_BY,
  },
  {
    field: 'package_policy.created_at',
    name: i18n.translate('xpack.csp.benchmarks.benchmarksTable.createdAtColumnTitle', {
      defaultMessage: 'Created at',
    }),
    dataType: 'date',
    truncateText: true,
    render: (date: Benchmark['package_policy']['created_at']) => moment(date).fromNow(),
    sortable: true,
    'data-test-subj': TEST_SUBJ.BENCHMARKS_TABLE_COLUMNS.CREATED_AT,
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
