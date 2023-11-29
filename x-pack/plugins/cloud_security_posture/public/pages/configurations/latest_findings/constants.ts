/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FindingsBaseURLQuery } from '../../../common/types';
import { CloudSecurityDefaultColumn } from '../../../components/cloud_security_data_table';

export const FINDINGS_UNIT = (totalCount: number) =>
  i18n.translate('xpack.csp.findings.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {finding} other {findings}}`,
  });

export const defaultGroupingOptions = [
  {
    label: i18n.translate('xpack.csp.findings.latestFindings.groupByResource', {
      defaultMessage: 'Resource',
    }),
    key: 'resource.name',
  },
  {
    label: i18n.translate('xpack.csp.findings.latestFindings.groupByRuleName', {
      defaultMessage: 'Rule name',
    }),
    key: 'rule.name',
  },
  {
    label: i18n.translate('xpack.csp.findings.latestFindings.groupByCloudAccount', {
      defaultMessage: 'Cloud account',
    }),
    key: 'cloud.account.name',
  },
  {
    label: i18n.translate('xpack.csp.findings.latestFindings.groupByKubernetesCluster', {
      defaultMessage: 'Kubernetes cluster',
    }),
    key: 'orchestrator.cluster.name',
  },
];

export const groupingTitle = i18n.translate('xpack.csp.findings.latestFindings.groupBy', {
  defaultMessage: 'Group findings by',
});

export const DEFAULT_TABLE_HEIGHT = 512;

export const getDefaultQuery = ({
  query,
  filters,
}: FindingsBaseURLQuery): FindingsBaseURLQuery & {
  sort: string[][];
} => ({
  query,
  filters,
  sort: [['@timestamp', 'desc']],
});

export const defaultColumns: CloudSecurityDefaultColumn[] = [
  { id: 'result.evaluation', width: 80 },
  { id: 'resource.id' },
  { id: 'resource.name' },
  { id: 'resource.sub_type' },
  { id: 'rule.benchmark.rule_number' },
  { id: 'rule.name' },
  { id: 'rule.section' },
  { id: '@timestamp' },
];
