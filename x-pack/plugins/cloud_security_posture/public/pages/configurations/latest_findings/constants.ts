/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { GroupOption } from '@kbn/securitysolution-grouping';
import { FINDINGS_GROUPING_OPTIONS } from '../../../common/constants';
import { FindingsBaseURLQuery } from '../../../common/types';
import { CloudSecurityDefaultColumn } from '../../../components/cloud_security_data_table';

export const FINDINGS_UNIT = (totalCount: number) =>
  i18n.translate('xpack.csp.findings.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {finding} other {findings}}`,
  });

export const NULL_GROUPING_UNIT = i18n.translate('xpack.csp.findings.grouping.nullGroupUnit', {
  defaultMessage: 'findings',
});

export const NULL_GROUPING_MESSAGES = {
  RESOURCE_NAME: i18n.translate('xpack.csp.findings.grouping.resource.nullGroupTitle', {
    defaultMessage: 'No resource',
  }),
  RULE_NAME: i18n.translate('xpack.csp.findings.grouping.rule.nullGroupTitle', {
    defaultMessage: 'No rule',
  }),
  CLOUD_ACCOUNT_NAME: i18n.translate('xpack.csp.findings.grouping.cloudAccount.nullGroupTitle', {
    defaultMessage: 'No cloud account',
  }),
  ORCHESTRATOR_CLUSTER_NAME: i18n.translate(
    'xpack.csp.findings.grouping.kubernetes.nullGroupTitle',
    { defaultMessage: 'No Kubernetes cluster' }
  ),
  DEFAULT: i18n.translate('xpack.csp.findings.grouping.default.nullGroupTitle', {
    defaultMessage: 'No grouping',
  }),
};

export const defaultGroupingOptions: GroupOption[] = [
  {
    label: i18n.translate('xpack.csp.findings.latestFindings.groupByResource', {
      defaultMessage: 'Resource',
    }),
    key: FINDINGS_GROUPING_OPTIONS.RESOURCE_NAME,
  },
  {
    label: i18n.translate('xpack.csp.findings.latestFindings.groupByRuleName', {
      defaultMessage: 'Rule name',
    }),
    key: FINDINGS_GROUPING_OPTIONS.RULE_NAME,
  },
  {
    label: i18n.translate('xpack.csp.findings.latestFindings.groupByCloudAccount', {
      defaultMessage: 'Cloud account',
    }),
    key: FINDINGS_GROUPING_OPTIONS.CLOUD_ACCOUNT_NAME,
  },
  {
    label: i18n.translate('xpack.csp.findings.latestFindings.groupByKubernetesCluster', {
      defaultMessage: 'Kubernetes cluster',
    }),
    key: FINDINGS_GROUPING_OPTIONS.ORCHESTRATOR_CLUSTER_NAME,
  },
];

export const groupingTitle = i18n.translate('xpack.csp.findings.latestFindings.groupBy', {
  defaultMessage: 'Group findings by',
});

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
