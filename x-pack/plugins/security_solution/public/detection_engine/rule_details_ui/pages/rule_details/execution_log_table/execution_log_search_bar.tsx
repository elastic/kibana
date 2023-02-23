/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { replace } from 'lodash';
import { EuiFieldSearch, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { RuleExecutionStatus } from '../../../../../../common/detection_engine/rule_monitoring';
import { ExecutionStatusFilter } from '../../../../rule_monitoring';

import * as i18n from './translations';

export const EXECUTION_LOG_SCHEMA_MAPPING = {
  status: 'kibana.alert.rule.execution.status',
  timestamp: '@timestamp',
  duration: 'event.duration',
  message: 'message',
  gapDuration: 'kibana.alert.rule.execution.metrics.execution_gap_duration_s',
  indexDuration: 'kibana.alert.rule.execution.metrics.total_indexing_duration_ms',
  searchDuration: 'kibana.alert.rule.execution.metrics.total_search_duration_ms',
  totalActions: 'kibana.alert.rule.execution.metrics.number_of_triggered_actions',
  schedulingDelay: 'kibana.task.schedule_delay',
};

export const replaceQueryTextAliases = (queryText: string): string => {
  return Object.entries(EXECUTION_LOG_SCHEMA_MAPPING).reduce<string>(
    (updatedQuery, [key, value]) => {
      return replace(updatedQuery, key, value);
    },
    queryText
  );
};

// This only includes statuses which are or can be final
const STATUS_FILTERS = [
  RuleExecutionStatus.succeeded,
  RuleExecutionStatus.failed,
  RuleExecutionStatus['partial failure'],
];

interface ExecutionLogTableSearchProps {
  onlyShowFilters: true;
  selectedStatuses: RuleExecutionStatus[];
  onStatusFilterChange: (selectedStatuses: RuleExecutionStatus[]) => void;
  onSearch: (queryText: string) => void;
}

/**
 * SearchBar + StatusFilters component to be used with the Rule Execution Log table
 * NOTE: The SearchBar component is currently not shown in the UI as custom search queries
 * are not yet fully supported by the Rule Execution Log aggregation API since
 * certain queries could result in missing data or inclusion of wrong events.
 * Please see this comment for history/details: https://github.com/elastic/kibana/pull/127339/files#r825240516
 */
export const ExecutionLogSearchBar = React.memo<ExecutionLogTableSearchProps>(
  ({ onlyShowFilters, selectedStatuses, onStatusFilterChange, onSearch }) => {
    const handleSearch = useCallback(
      (queryText: string) => {
        onSearch(replaceQueryTextAliases(queryText));
      },
      [onSearch]
    );

    return (
      <EuiFlexGroup gutterSize={'s'}>
        <EuiFlexItem grow={true}>
          {!onlyShowFilters && (
            <EuiFieldSearch
              data-test-subj="executionLogSearch"
              aria-label={i18n.RULE_EXECUTION_LOG_SEARCH_PLACEHOLDER}
              placeholder={i18n.RULE_EXECUTION_LOG_SEARCH_PLACEHOLDER}
              onSearch={handleSearch}
              isClearable={true}
              fullWidth={true}
            />
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ExecutionStatusFilter
            items={STATUS_FILTERS}
            selectedItems={selectedStatuses}
            onChange={onStatusFilterChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

ExecutionLogSearchBar.displayName = 'ExecutionLogSearchBar';
