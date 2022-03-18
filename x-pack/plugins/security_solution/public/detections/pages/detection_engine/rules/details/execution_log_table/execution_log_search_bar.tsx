/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { capitalize, replace } from 'lodash';
import {
  EuiHealth,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiFilterGroup,
  EuiFilterButton,
  EuiFilterSelectItem,
} from '@elastic/eui';
import { RuleExecutionStatus } from '../../../../../../../common/detection_engine/schemas/common';
import { getStatusColor } from '../../../../../components/rules/rule_execution_status/utils';
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

const statuses = [
  RuleExecutionStatus.succeeded,
  RuleExecutionStatus.failed,
  RuleExecutionStatus['partial failure'],
];

const statusFilters = statuses.map((status) => ({
  label: <EuiHealth color={getStatusColor(status)}>{capitalize(status)}</EuiHealth>,
  selected: false,
}));

interface ExecutionLogTableSearchProps {
  onlyShowFilters: true;
  onSearch: (queryText: string) => void;
  onStatusFilterChange: (statusFilters: string[]) => void;
}

export const ExecutionLogSearchBar = React.memo<ExecutionLogTableSearchProps>(
  ({ onlyShowFilters, onSearch, onStatusFilterChange }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [selectedFilters, setSelectedFilters] = useState<RuleExecutionStatus[]>([]);

    const onSearchCallback = useCallback(
      (queryText: string) => {
        onSearch(replaceQueryTextAliases(queryText));
      },
      [onSearch]
    );

    const onStatusFilterChangeCallback = useCallback(
      (filter: RuleExecutionStatus) => {
        setSelectedFilters(
          selectedFilters.includes(filter)
            ? selectedFilters.filter((f) => f !== filter)
            : [...selectedFilters, filter]
        );
      },
      [selectedFilters]
    );

    const filtersComponent = useMemo(() => {
      return statuses.map((filter, index) => (
        <EuiFilterSelectItem
          checked={selectedFilters.includes(filter) ? 'on' : undefined}
          key={`${index}-${filter}`}
          onClick={() => onStatusFilterChangeCallback(filter)}
          title={filter}
        >
          <EuiHealth color={getStatusColor(filter)}>{capitalize(filter)}</EuiHealth>
        </EuiFilterSelectItem>
      ));
    }, [onStatusFilterChangeCallback, selectedFilters]);

    useEffect(() => {
      onStatusFilterChange(selectedFilters);
    }, [onStatusFilterChange, selectedFilters]);

    return (
      <EuiFlexGroup gutterSize={'s'}>
        <EuiFlexItem grow={true}>
          {!onlyShowFilters && (
            <EuiFieldSearch
              data-test-subj="executionLogSearch"
              aria-label={i18n.RULE_EXECUTION_LOG_SEARCH_PLACEHOLDER}
              placeholder={i18n.RULE_EXECUTION_LOG_SEARCH_PLACEHOLDER}
              onSearch={onSearchCallback}
              isClearable={true}
              fullWidth={true}
            />
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFilterGroup>
            <EuiPopover
              button={
                <EuiFilterButton
                  grow={false}
                  data-test-subj={'status-filter-popover-button'}
                  iconType="arrowDown"
                  onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                  numFilters={statusFilters.length}
                  isSelected={isPopoverOpen}
                  hasActiveFilters={selectedFilters.length > 0}
                  numActiveFilters={selectedFilters.length}
                >
                  {i18n.COLUMN_STATUS}
                </EuiFilterButton>
              }
              isOpen={isPopoverOpen}
              closePopover={() => setIsPopoverOpen(false)}
              panelPaddingSize="none"
              repositionOnScroll
            >
              {filtersComponent}
            </EuiPopover>
          </EuiFilterGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

ExecutionLogSearchBar.displayName = 'ExecutionLogSearchBar';
