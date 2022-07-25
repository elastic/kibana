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
  EuiSwitch,
  EuiTableFieldDataColumnType,
  EuiBasicTable,
  EuiBasicTableProps,
  useEuiTheme,
} from '@elastic/eui';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import type { RulesState } from './rules_container';
import * as TEST_SUBJECTS from './test_subjects';
import type { RuleSavedObject } from './use_csp_rules';

type RulesTableProps = Pick<
  RulesState,
  'loading' | 'error' | 'rules_page' | 'total' | 'perPage' | 'page'
> & {
  toggleRule(rule: RuleSavedObject): void;
  setSelectedRules(rules: RuleSavedObject[]): void;
  setPagination(pagination: Pick<RulesState, 'perPage' | 'page'>): void;
  setSelectedRuleId(id: string | null): void;
  selectedRuleId: string | null;
  // ForwardRef makes this ref not available in parent callbacks
  tableRef: React.RefObject<EuiBasicTable<RuleSavedObject>>;
  canUpdate: boolean;
};

export const RulesTable = ({
  toggleRule,
  setSelectedRules,
  setPagination,
  setSelectedRuleId,
  perPage: pageSize,
  rules_page: items,
  page,
  tableRef,
  total,
  loading,
  error,
  selectedRuleId,
  canUpdate,
}: RulesTableProps) => {
  const { euiTheme } = useEuiTheme();
  const columns = useMemo(
    () => getColumns({ toggleRule, setSelectedRuleId, canUpdate }),
    [setSelectedRuleId, toggleRule, canUpdate]
  );

  const euiPagination: EuiBasicTableProps<RuleSavedObject>['pagination'] = {
    pageIndex: page,
    pageSize,
    totalItemCount: total,
    pageSizeOptions: [10, 25, 100],
  };

  const selection: EuiBasicTableProps<RuleSavedObject>['selection'] = {
    selectable: () => true,
    onSelectionChange: setSelectedRules,
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
      ref={tableRef}
      data-test-subj={TEST_SUBJECTS.CSP_RULES_TABLE}
      loading={loading}
      error={error}
      items={items}
      columns={columns}
      pagination={euiPagination}
      onChange={onTableChange}
      isSelectable={true}
      selection={selection}
      itemId={(v) => v.id}
      rowProps={rowProps}
    />
  );
};

interface GetColumnProps extends Pick<RulesTableProps, 'setSelectedRuleId' | 'canUpdate'> {
  toggleRule: (rule: RuleSavedObject) => void;
}

const getColumns = ({
  toggleRule,
  setSelectedRuleId,
  canUpdate,
}: GetColumnProps): Array<EuiTableFieldDataColumnType<RuleSavedObject>> => [
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
    render: (timestamp) => moment(timestamp).fromNow(),
  },
  {
    field: 'attributes.enabled',
    name: i18n.translate('xpack.csp.rules.rulesTable.enabledColumnLabel', {
      defaultMessage: 'Enabled',
    }),
    render: (enabled, rule) => (
      <EuiSwitch
        disabled={!canUpdate}
        showLabel={false}
        label={
          enabled
            ? i18n.translate('xpack.csp.rules.rulesTable.enabledColumn.disableSwitchLabel', {
                defaultMessage: 'Disable',
              })
            : i18n.translate('xpack.csp.rules.rulesTable.enabledColumn.enableSwitchLabel', {
                defaultMessage: 'Enable',
              })
        }
        checked={enabled}
        onChange={() => toggleRule(rule)}
        data-test-subj={TEST_SUBJECTS.getCspRulesTableItemSwitchTestId(rule.id)}
      />
    ),
    width: '10%',
  },
];
