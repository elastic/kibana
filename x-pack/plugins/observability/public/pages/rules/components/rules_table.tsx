/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiBasicTable, EuiSpacer, EuiTableSortingType } from '@elastic/eui';
import { RulesTableProps } from '../types';
import { RuleTableItem } from '../../../../../triggers_actions_ui/public';

export interface Pagination {
  index: number;
  size: number;
}

export function RulesTable({
  columns,
  rules,
  page,
  totalItemCount,
  onPageChange,
  sort,
  onSortChange,
  isLoading,
}: RulesTableProps) {
  // if initial load, show spinner
  const getRulesList = () => {
    return (
      <>
        <EuiSpacer size="xs" />

        <EuiBasicTable
          loading={isLoading}
          items={rules}
          itemId="id"
          columns={columns}
          data-test-subj="rulesList"
          pagination={{
            pageIndex: page.index,
            pageSize: page.size,
            totalItemCount,
          }}
          sorting={{ sort }}
          onChange={({
            page: changedPage,
            sort: changedSort,
          }: {
            page?: Pagination;
            sort?: EuiTableSortingType<RuleTableItem>['sort'];
          }) => {
            if (changedPage) {
              onPageChange(changedPage);
            }
            if (changedSort) {
              onSortChange(changedSort);
            }
          }}
        />
      </>
    );
  };

  return (
    <section data-test-subj="rulesList">
      <EuiSpacer size="xs" />
      {getRulesList()}
    </section>
  );
}
