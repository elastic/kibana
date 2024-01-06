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
import { vulnerabilitiesColumns } from './vulnerabilities_table_columns';

export const DEFAULT_TABLE_HEIGHT = 512;

export const GROUPING_OPTIONS = {
  RESOURCE_NAME: 'resource.name',
};

export const defaultGroupingOptions: GroupOption[] = [
  {
    label: GROUPING_LABELS.RESOURCE_NAME,
    key: GROUPING_OPTIONS.RESOURCE_NAME,
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
    [vulnerabilitiesColumns.severity, 'desc'],
    [vulnerabilitiesColumns.cvss, 'desc'],
  ],
});

export const defaultColumns: CloudSecurityDefaultColumn[] = [
  { id: 'vulnerability.id', width: 130 },
  { id: 'vulnerability.score.base', width: 80 },
  { id: 'resource.name' },
  { id: 'resource.id' },
  { id: 'vulnerability.severity', width: 100 },
  { id: 'package.name' },
  { id: 'package.version' },
  { id: 'package.fixed_version' },
];
