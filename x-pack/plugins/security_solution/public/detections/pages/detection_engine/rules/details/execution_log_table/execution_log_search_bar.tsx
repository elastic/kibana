/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHealth, EuiSearchBar, EuiSearchBarProps, SearchFilterConfig } from '@elastic/eui';
import { RuleExecutionStatus } from '../../../../../../../common/detection_engine/schemas/common';
import { getStatusColor } from '../../../../../components/rules/rule_execution_status/utils';

import * as i18n from '../translations';

interface ExecutionLogTableSearchProps {
  onSearch: (args: Parameters<NonNullable<EuiSearchBarProps['onChange']>>[0]) => void;
}

export const EXECUTION_LOG_SEARCH_SCHEMA = {
  strict: true,
  fields: {
    'kibana.alert.rule.execution.status': {
      type: 'string',
    },
    '@timestamp': {
      type: 'string',
    },
    'event.duration': {
      type: 'number',
    },
    message: {
      type: 'string',
    },
    'kibana.alert.rule.execution.metrics.total_alerts': {
      type: 'number',
    },
    'kibana.alert.rule.execution.metrics.total_hits': {
      type: 'number',
    },
    'kibana.alert.rule.execution.metrics.execution_gap_duration_s': {
      type: 'number',
    },
    'kibana.alert.rule.execution.metrics.total_indexing_duration_ms': {
      type: 'number',
    },
    'kibana.alert.rule.execution.metrics.total_search_duration_ms': {
      type: 'number',
    },
  },
};

const statuses = (Object.keys(RuleExecutionStatus) as Array<keyof typeof RuleExecutionStatus>).map(
  (key) => key
);

const filters: SearchFilterConfig[] = [
  {
    type: 'field_value_selection',
    field: 'kibana.alert.rule.execution.status',
    name: 'Status',
    multiSelect: 'or',
    options: statuses.map((status) => ({
      value: status,
      view: <EuiHealth color={getStatusColor(status)}>{status}</EuiHealth>,
    })),
  },
];

export const ExecutionLogSearchBar = React.memo<ExecutionLogTableSearchProps>(({ onSearch }) => {
  return (
    <EuiSearchBar
      data-test-subj="executionLogSearch"
      aria-label={i18n.RULE_EXECUTION_LOG_SEARCH_PLACEHOLDER}
      onChange={onSearch}
      filters={filters}
      box={{
        [`data-test-subj`]: 'executionLogSearchInput',
        placeholder: i18n.RULE_EXECUTION_LOG_SEARCH_PLACEHOLDER,
        incremental: false,
        schema: EXECUTION_LOG_SEARCH_SCHEMA,
      }}
    />
  );
});

ExecutionLogSearchBar.displayName = 'ExecutionLogSearchBar';
