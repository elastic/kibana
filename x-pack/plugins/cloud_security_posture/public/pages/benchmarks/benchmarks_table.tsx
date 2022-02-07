/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTable, type EuiBasicTableColumn } from '@elastic/eui';
import React from 'react';
import moment from 'moment';
import { TABLE_COLUMN_HEADERS } from './translations';
import type { CspBenchmarkIntegration } from './types';

interface BenchmarksTableProps {
  benchmarks: CspBenchmarkIntegration[];
  'data-test-subj'?: string;
}

const BENCHMARKS_TABLE_COLUMNS: Array<EuiBasicTableColumn<CspBenchmarkIntegration>> = [
  {
    field: 'integration_name',
    name: TABLE_COLUMN_HEADERS.INTEGRATION_NAME,
    dataType: 'string',
  },
  {
    field: 'benchmark',
    name: TABLE_COLUMN_HEADERS.BENCHMARK,
    dataType: 'string',
  },
  {
    render: (benchmarkIntegration: CspBenchmarkIntegration) =>
      `${benchmarkIntegration.rules.active} of ${benchmarkIntegration.rules.total}`,
    name: TABLE_COLUMN_HEADERS.ACTIVE_RULES,
  },
  {
    field: 'agent_policy.name',
    name: TABLE_COLUMN_HEADERS.AGENT_POLICY,
    dataType: 'string',
  },
  {
    field: 'agent_policy.number_of_agents',
    name: TABLE_COLUMN_HEADERS.NUMBER_OF_AGENTS,
    dataType: 'number',
  },
  {
    field: 'created_by',
    name: TABLE_COLUMN_HEADERS.CREATED_BY,
    dataType: 'string',
  },
  {
    field: 'created_at',
    name: TABLE_COLUMN_HEADERS.CREATED_AT,
    dataType: 'date',
    render: (date: CspBenchmarkIntegration['created_at']) => moment(date).fromNow(),
  },
];

export const BenchmarksTable = ({ benchmarks, ...rest }: BenchmarksTableProps) => (
  <EuiBasicTable
    data-test-subj={rest['data-test-subj']}
    items={benchmarks}
    columns={BENCHMARKS_TABLE_COLUMNS}
  />
);
