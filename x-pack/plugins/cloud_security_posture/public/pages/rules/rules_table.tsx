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
  EuiToolTip,
  EuiTableFieldDataColumnType,
  EuiBasicTable,
  EuiBasicTableProps,
  useEuiTheme,
} from '@elastic/eui';
import moment from 'moment';
import { FormattedMessage } from '@kbn/i18n-react';
import type { RulesState } from './rules_container';
import * as TEST_SUBJECTS from './test_subjects';
import * as TEXT from './translations';
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
}: RulesTableProps) => {
  const { euiTheme } = useEuiTheme();
  const columns = useMemo(
    () => getColumns({ toggleRule, setSelectedRuleId }),
    [setSelectedRuleId, toggleRule]
  );

  const euiPagination: EuiBasicTableProps<RuleSavedObject>['pagination'] = {
    pageIndex: page,
    pageSize,
    totalItemCount: total,
    pageSizeOptions: [1, 5, 10, 25],
    hidePerPageOptions: false,
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

interface GetColumnProps extends Pick<RulesTableProps, 'setSelectedRuleId'> {
  toggleRule: (rule: RuleSavedObject) => void;
}

const getColumns = ({
  toggleRule,
  setSelectedRuleId,
}: GetColumnProps): Array<EuiTableFieldDataColumnType<RuleSavedObject>> => [
  {
    field: 'attributes.name',
    name: TEXT.RULE_NAME,
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
      >
        {name}
      </EuiButtonEmpty>
    ),
  },
  {
    field: 'section', // TODO: what field is this?
    name: TEXT.SECTION,
    width: '15%',
  },
  {
    field: 'updatedAt',
    name: TEXT.UPDATED_AT,
    width: '15%',
    render: (timestamp) => moment(timestamp).fromNow(),
  },
  {
    field: 'attributes.enabled',
    name: TEXT.ENABLED,
    render: (enabled, rule) => (
      <EuiToolTip
        content={
          enabled ? (
            <FormattedMessage
              id="xpack.csp.rules.rulesTableHeader.deactivateRuleTooltip"
              defaultMessage="Deactivate Rule"
            />
          ) : (
            <FormattedMessage
              id="xpack.csp.rules.rulesTableHeader.activateRuleTooltip"
              defaultMessage="Activate Rule"
            />
          )
        }
      >
        <EuiSwitch
          showLabel={false}
          label={enabled ? TEXT.DISABLE : TEXT.ENABLE}
          checked={enabled}
          onChange={() => toggleRule(rule)}
          data-test-subj={TEST_SUBJECTS.getCspRulesTableItemSwitchTestId(rule.attributes.id)}
        />
      </EuiToolTip>
    ),
    width: '10%',
  },
];
