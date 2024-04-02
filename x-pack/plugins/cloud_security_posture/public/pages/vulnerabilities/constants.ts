/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GroupOption } from '@kbn/securitysolution-grouping';
import { FindingsBaseURLQuery } from '../../common/types';
import { CloudSecurityDefaultColumn } from '../../components/cloud_security_data_table';
import { GROUPING_LABELS } from './translations';

export const VULNERABILITY_FIELDS = {
  VULNERABILITY_ID: 'vulnerability.id',
  SCORE_BASE: 'vulnerability.score.base',
  RESOURCE_NAME: 'resource.name',
  RESOURCE_ID: 'resource.id',
  SEVERITY: 'vulnerability.severity',
  PACKAGE_NAME: 'package.name',
  PACKAGE_VERSION: 'package.version',
  PACKAGE_FIXED_VERSION: 'package.fixed_version',
  CLOUD_ACCOUNT_NAME: 'cloud.account.name',
  CLOUD_PROVIDER: 'cloud.provider',
  DESCRIPTION: 'vulnerability.description',
} as const;

export const GROUPING_OPTIONS = {
  RESOURCE_NAME: VULNERABILITY_FIELDS.RESOURCE_NAME,
  CLOUD_ACCOUNT_NAME: VULNERABILITY_FIELDS.CLOUD_ACCOUNT_NAME,
  CVE: VULNERABILITY_FIELDS.VULNERABILITY_ID,
};

export const defaultGroupingOptions: GroupOption[] = [
  {
    label: GROUPING_LABELS.RESOURCE_NAME,
    key: GROUPING_OPTIONS.RESOURCE_NAME,
  },
  {
    label: GROUPING_LABELS.CLOUD_ACCOUNT_NAME,
    key: GROUPING_OPTIONS.CLOUD_ACCOUNT_NAME,
  },
  {
    label: 'CVE',
    key: GROUPING_OPTIONS.CVE,
  },
];

export const getDefaultQuery = ({
  query,
  filters,
}: FindingsBaseURLQuery): FindingsBaseURLQuery & {
  sort: string[][];
} => ({
  query,
  filters,
  sort: [
    [VULNERABILITY_FIELDS.SEVERITY, 'asc'],
    [VULNERABILITY_FIELDS.SCORE_BASE, 'desc'],
  ],
});

export const defaultColumns: CloudSecurityDefaultColumn[] = [
  { id: VULNERABILITY_FIELDS.VULNERABILITY_ID, width: 130 },
  { id: VULNERABILITY_FIELDS.SCORE_BASE, width: 80 },
  { id: VULNERABILITY_FIELDS.RESOURCE_NAME },
  { id: VULNERABILITY_FIELDS.RESOURCE_ID },
  { id: VULNERABILITY_FIELDS.SEVERITY, width: 100 },
  { id: VULNERABILITY_FIELDS.PACKAGE_NAME },
  { id: VULNERABILITY_FIELDS.PACKAGE_VERSION },
  { id: VULNERABILITY_FIELDS.PACKAGE_FIXED_VERSION },
];
