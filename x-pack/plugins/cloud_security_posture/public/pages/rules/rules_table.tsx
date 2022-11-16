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
  EuiButtonIcon,
  EuiToolTip,
  EuiTableComputedColumnType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TimestampTableCell } from '../../components/timestamp_table_cell';
import type { RulesState } from './rules_container';
import * as TEST_SUBJECTS from './test_subjects';
import type { RuleSavedObject } from './use_csp_rules';
import { useNavigateFindings } from '../../common/hooks/use_navigate_findings';

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

  const navigateToFindings = useNavigateFindings();
  const columns = useMemo(
    () =>
      getColumns({
        setSelectedRuleId,
        navigateToRuleFindings: (name: string) =>
          navigateToFindings({
            ['rule.name']: name,
          }),
      }),
    [setSelectedRuleId, navigateToFindings]
  );

  const euiPagination: EuiBasicTableProps<RuleSavedObject>['pagination'] = {
    pageIndex: page,
    pageSize,
    totalItemCount: total,
    pageSizeOptions: [10, 25, 100],
  };

  const onTableChange = ({ page: pagination }: Criteria<RuleSavedObject>) => {
    if (!pagination) return;
    setPagination({ page: pagination.index, perPage: pagination.size });
  };

  const rowProps = (row: RuleSavedObject) => ({
    ['data-test-subj']: TEST_SUBJECTS.getCspRulesTableRowItemTestId(row.id),
    style: { background: row.id === selectedRuleId ? euiTheme.colors.highlight : undefined },
    onClick: (e: MouseEvent) => {
      const tag = (e.target as HTMLDivElement).tagName;
      // Ignore checkbox and switch toggle columns
      if (tag === 'BUTTON' || tag === 'INPUT') return;
      setSelectedRuleId(row.id);
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
      itemId={(v) => v.id}
      rowProps={rowProps}
    />
  );
};

type GetColumnProps = Pick<RulesTableProps, 'setSelectedRuleId'> & {
  navigateToRuleFindings(name: string): void;
};

const getColumns = ({
  setSelectedRuleId,
  navigateToRuleFindings,
}: GetColumnProps): Array<
  EuiTableFieldDataColumnType<RuleSavedObject> | EuiTableComputedColumnType<RuleSavedObject>
> => [
  {
    field: 'attributes.metadata.name',
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
          setSelectedRuleId(rule.id);
        }}
        data-test-subj={TEST_SUBJECTS.CSP_RULES_TABLE_ROW_ITEM_NAME}
      >
        {name}
      </EuiButtonEmpty>
    ),
  },
  {
    field: 'attributes.metadata.section',
    name: i18n.translate('xpack.csp.rules.rulesTable.cisSectionColumnLabel', {
      defaultMessage: 'CIS Section',
    }),
    width: '15%',
  },
  {
    field: 'updatedAt',
    name: i18n.translate('xpack.csp.rules.rulesTable.lastModifiedColumnLabel', {
      defaultMessage: 'Last Modified',
    }),
    width: '15%',
    render: (timestamp: number) => <TimestampTableCell timestamp={timestamp} />,
  },
  {
    width: '50px',
    name: i18n.translate('xpack.csp.rules.rulesTable.goToFindingsColumnLabel', {
      defaultMessage: 'Findings',
    }),
    render: (data: RuleSavedObject) => (
      <EuiToolTip
        content={i18n.translate('xpack.csp.rules.rulesTable.goToFindingsCellLabel', {
          defaultMessage: 'Go to rules findings',
        })}
      >
        <EuiButtonIcon
          iconType={'inspect'}
          size="s"
          onClick={() => navigateToRuleFindings(data.attributes.metadata.name)}
        />
      </EuiToolTip>
    ),
  },
];
