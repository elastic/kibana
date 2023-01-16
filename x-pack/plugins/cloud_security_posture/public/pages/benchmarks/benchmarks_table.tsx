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
  EuiLink,
} from '@elastic/eui';
import React from 'react';
import { generatePath } from 'react-router-dom';
import { pagePathGetters } from '@kbn/fleet-plugin/public';
import { i18n } from '@kbn/i18n';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import { TimestampTableCell } from '../../components/timestamp_table_cell';
import type { Benchmark } from '../../../common/types';
import { useKibana } from '../../common/hooks/use_kibana';
import { benchmarksNavigation } from '../../common/navigation/constants';
import * as TEST_SUBJ from './test_subjects';
import { getEnabledCspIntegrationDetails } from '../../common/utils/get_enabled_csp_integration_details';

interface BenchmarksTableProps
  extends Pick<EuiBasicTableProps<Benchmark>, 'loading' | 'error' | 'noItemsMessage' | 'sorting'>,
    Pagination {
  benchmarks: Benchmark[];
  setQuery(pagination: CriteriaWithPagination<Benchmark>): void;
  'data-test-subj'?: string;
}

const AgentPolicyButtonLink = ({ name, id: policyId }: { name: string; id: string }) => {
  const { http } = useKibana().services;
  const [fleetBase, path] = pagePathGetters.policy_details({ policyId });

  return <EuiLink href={http.basePath.prepend([fleetBase, path].join(''))}>{name}</EuiLink>;
};

const IntegrationButtonLink = ({
  packageName,
  policyId,
  packagePolicyId,
}: {
  packageName: string;
  packagePolicyId: string;
  policyId: string;
}) => {
  const { application } = useKibana().services;
  return (
    <EuiLink
      href={application.getUrlForApp('security', {
        path: generatePath(benchmarksNavigation.rules.path, {
          packagePolicyId,
          policyId,
        }),
      })}
    >
      {packageName}
    </EuiLink>
  );
};

const BENCHMARKS_TABLE_COLUMNS: Array<EuiBasicTableColumn<Benchmark>> = [
  {
    field: 'package_policy.name',
    name: i18n.translate('xpack.csp.benchmarks.benchmarksTable.integrationNameColumnTitle', {
      defaultMessage: 'Integration Name',
    }),
    render: (packageName, benchmark) => (
      <IntegrationButtonLink
        packageName={packageName}
        packagePolicyId={benchmark.package_policy.id}
        policyId={benchmark.package_policy.policy_id}
      />
    ),
    truncateText: true,
    sortable: true,
    'data-test-subj': TEST_SUBJ.BENCHMARKS_TABLE_COLUMNS.INTEGRATION_NAME,
  },
  {
    field: 'rules_count',
    name: i18n.translate('xpack.csp.benchmarks.benchmarksTable.rulesColumnTitle', {
      defaultMessage: 'Rules',
    }),
    truncateText: true,
    'data-test-subj': TEST_SUBJ.BENCHMARKS_TABLE_COLUMNS.RULES,
  },
  {
    field: 'package_policy',
    name: i18n.translate('xpack.csp.benchmarks.benchmarksTable.integrationColumnTitle', {
      defaultMessage: 'Integration',
    }),
    dataType: 'string',
    truncateText: true,
    sortable: true,
    'data-test-subj': TEST_SUBJ.BENCHMARKS_TABLE_COLUMNS.INTEGRATION,
    render: (field: PackagePolicy) => {
      const enabledIntegration = getEnabledCspIntegrationDetails(field);
      return enabledIntegration?.integration?.shortName || ' ';
    },
  },
  {
    field: 'package_policy',
    name: i18n.translate('xpack.csp.benchmarks.benchmarksTable.deploymentTypeColumnTitle', {
      defaultMessage: 'Deployment Type',
    }),
    dataType: 'string',
    truncateText: true,
    sortable: true,
    'data-test-subj': TEST_SUBJ.BENCHMARKS_TABLE_COLUMNS.DEPLOYMENT_TYPE,
    render: (field: PackagePolicy) => {
      const enabledIntegration = getEnabledCspIntegrationDetails(field);
      return enabledIntegration?.enabledIntegrationOption?.name || ' ';
    },
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
    render: (timestamp: Benchmark['package_policy']['created_at']) => (
      <TimestampTableCell timestamp={timestamp} />
    ),
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
