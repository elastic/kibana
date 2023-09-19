/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import {
  Criteria,
  EuiButtonEmpty,
  EuiTableFieldDataColumnType,
  EuiBasicTable,
  EuiBasicTableProps,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CspRuleTemplate } from '../../../common/schemas';
import type { RulesState } from './rules_container';
import * as TEST_SUBJECTS from './test_subjects';

type RulesTableProps = Pick<
  RulesState,
  'loading' | 'error' | 'rules_page' | 'total' | 'perPage' | 'page'
> & {
  setPagination(pagination: Pick<RulesState, 'perPage' | 'page'>): void;
  setSelectedRuleId(id: string | null): void;
  selectedRuleId: string | null;
};

export const RulesTable = ({
  setPagination,
  setSelectedRuleId,
  perPage: pageSize,
  rules_page: items,
  page,
  total,
  loading,
  error,
  selectedRuleId,
}: RulesTableProps) => {
  const { euiTheme } = useEuiTheme();
  const columns = useMemo(() => getColumns({ setSelectedRuleId }), [setSelectedRuleId]);

  const euiPagination: EuiBasicTableProps<CspRuleTemplate>['pagination'] = {
    pageIndex: page,
    pageSize,
    totalItemCount: total,
    pageSizeOptions: [10, 25, 100],
  };

  const onTableChange = ({ page: pagination }: Criteria<CspRuleTemplate>) => {
    if (!pagination) return;
    setPagination({ page: pagination.index, perPage: pagination.size });
  };

  const rowProps = (row: CspRuleTemplate) => ({
    ['data-test-subj']: TEST_SUBJECTS.getCspRuleTemplatesTableRowItemTestId(row.metadata.id),
    style: {
      background: row.metadata.id === selectedRuleId ? euiTheme.colors.highlight : undefined,
    },
    onClick: (e: MouseEvent) => {
      const tag = (e.target as HTMLDivElement).tagName;
      // Ignore checkbox and switch toggle columns
      if (tag === 'BUTTON' || tag === 'INPUT') return;
      setSelectedRuleId(row.metadata.id);
    },
  });

  return (
    <EuiBasicTable
      data-test-subj={TEST_SUBJECTS.CSP_RULES_TABLE}
      loading={loading}
      error={error}
      items={items}
      columns={columns}
      pagination={euiPagination}
      onChange={onTableChange}
      itemId={(v) => v.metadata.id}
      rowProps={rowProps}
    />
  );
};

type GetColumnProps = Pick<RulesTableProps, 'setSelectedRuleId'>;

const getColumns = ({
  setSelectedRuleId,
}: GetColumnProps): Array<EuiTableFieldDataColumnType<CspRuleTemplate>> => [
  {
    field: 'metadata.name',
    name: i18n.translate('xpack.csp.rules.rulesTable.nameColumnLabel', {
      defaultMessage: 'Name',
    }),
    width: '60%',
    truncateText: true,
    render: (name, rule) => (
      <EuiButtonEmpty
        className="eui-textTruncate"
        title={name}
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation();
          setSelectedRuleId(rule.metadata.id);
        }}
        data-test-subj={TEST_SUBJECTS.CSP_RULES_TABLE_ROW_ITEM_NAME}
      >
        {name}
      </EuiButtonEmpty>
    ),
  },
  {
    field: 'metadata.section',
    name: i18n.translate('xpack.csp.rules.rulesTable.cisSectionColumnLabel', {
      defaultMessage: 'CIS Section',
    }),
    width: '15%',
  },
];
