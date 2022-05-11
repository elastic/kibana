/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Dispatch, SetStateAction } from 'react';
import { EuiTableSortingType, EuiBasicTableColumn } from '@elastic/eui';
import { RuleExecutionStatus } from '@kbn/alerting-plugin/common';
import { RuleTableItem, Rule, RuleStatus } from '@kbn/triggers-actions-ui-plugin/public';

export interface LastResponseFilterProps {
  selectedStatuses: string[];
  onChange?: (selectedRuleStatusesIds: string[]) => void;
}

export interface ExecutionStatusProps {
  executionStatus: RuleExecutionStatus;
  item: RuleTableItem;
  licenseType: string;
}

export interface LastRunProps {
  date: Date;
}

export interface RuleNameProps {
  name: string;
  rule: RuleTableItem;
}

export interface EditFlyoutProps {
  currentRule: RuleTableItem;
  onSave: () => Promise<void>;
}

export interface Pagination {
  index: number;
  size: number;
}

export interface FetchRulesProps {
  searchText: string | undefined;
  ruleLastResponseFilter: string[];
  ruleStatusesFilter: RuleStatus[];
  typesFilter: string[];
  page: Pagination;
  setPage: Dispatch<SetStateAction<Pagination>>;
  sort: EuiTableSortingType<RuleTableItem>['sort'];
}

export interface RulesTableProps {
  columns: Array<EuiBasicTableColumn<RuleTableItem>>;
  rules: RuleTableItem[];
  page: Pagination;
  totalItemCount: number;
  onPageChange: (changedPage: Pagination) => void;
  sort: EuiTableSortingType<RuleTableItem>['sort'];
  onSortChange: (changedSort: EuiTableSortingType<RuleTableItem>['sort']) => void;
  isLoading: boolean;
}

export interface RuleState {
  isLoading: boolean;
  data: Rule[];
  error: string | null;
  totalItemCount: number;
}
