/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { EuiBasicTable, EuiSpacer, EuiTableSortingType } from '@elastic/eui';
import { RuleTableItem } from '@kbn/triggers-actions-ui-plugin/public';
import { RulesTableProps } from '../types';

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
  const onChange = useCallback(
    ({
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
    },
    [onPageChange, onSortChange]
  );
  return (
    <section>
      <EuiSpacer size="xs" />
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
          onChange={onChange}
        />
      </>
    </section>
  );
}
