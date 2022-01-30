/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import {
  Criteria,
  EuiLink,
  EuiSwitch,
  EuiTableFieldDataColumnType,
  EuiEmptyPrompt,
  EuiBasicTable,
  EuiBasicTableProps,
} from '@elastic/eui';
import moment from 'moment';
import type { RulesState, RuleSavedObject } from './rules_container';
import * as TEST_SUBJECTS from './test_subjects';
import * as TEXT from './translations';

type RulesTableProps = RulesState & {
  toggleRule(rule: RuleSavedObject): void;
  setSelectedRules(rules: RuleSavedObject[]): void;
  setPagination(pagination: Pick<RulesState, 'perPage' | 'page'>): void;
};

export const RulesTable = ({
  toggleRule,
  setSelectedRules,
  setPagination,
  perPage,
  page,
  ...props
}: RulesTableProps) => {
  const columns = useMemo(() => getColumns({ toggleRule }), [toggleRule]);

  const items = useMemo(
    () => (props.status === 'success' ? props.data?.slice() || [] : []),
    [props.data, props.status]
  );

  const euiPagination: EuiBasicTableProps<RuleSavedObject>['pagination'] = {
    pageIndex: Math.max(page - 1, 0),
    pageSize: perPage,
    totalItemCount: props.status === 'success' ? props.total : 0,
    pageSizeOptions: [1, 5, 10, 25],
    hidePerPageOptions: false,
  };

  const selection: EuiBasicTableProps<RuleSavedObject>['selection'] = {
    selectable: () => true,
    onSelectionChange: setSelectedRules,
  };

  const onTableChange = ({ page: _page }: Criteria<RuleSavedObject>) => {
    if (!_page) return;
    setPagination({ page: _page.index + 1, perPage: _page.size });
  };

  // Show "zero state"
  if (props.status === 'success' && !props.data)
    // TODO: use our own logo
    return <EuiEmptyPrompt iconType="logoKibana" title={<h2>{TEXT.MISSING_RULES}</h2>} />;

  return (
    <EuiBasicTable
      data-test-subj={TEST_SUBJECTS.CSP_RULES_TABLE}
      loading={props.status === 'loading'}
      error={props.error || undefined}
      items={items}
      columns={columns}
      pagination={euiPagination}
      onChange={onTableChange}
      isSelectable={true}
      selection={selection}
      itemId={(v) => v.id}
    />
  );
};

const ruleNameRenderer = (name: string) => (
  <EuiLink className="eui-textTruncate" title={name}>
    {name}
  </EuiLink>
);

const timestampRenderer = (timestamp: string) =>
  moment.duration(moment().diff(timestamp)).humanize();

interface GetColumnProps {
  toggleRule: (rule: RuleSavedObject) => void;
}

const createRuleEnabledSwitchRenderer =
  ({ toggleRule }: GetColumnProps) =>
  (value: any, rule: RuleSavedObject) =>
    (
      <EuiSwitch
        label=""
        checked={value}
        onChange={() => toggleRule(rule)}
        data-test-subj={TEST_SUBJECTS.getCspRulesTableItemSwitchTestId(rule.attributes.id)}
      />
    );

const getColumns = ({
  toggleRule,
}: GetColumnProps): Array<EuiTableFieldDataColumnType<RuleSavedObject>> => [
  {
    field: 'attributes.name',
    name: TEXT.RULE_NAME,
    width: '60%',
    truncateText: true,
    render: ruleNameRenderer,
  },
  {
    field: 'section', // TODO: what field is this?
    name: TEXT.SECTION,
    width: '15%',
  },
  {
    field: 'updated_at',
    name: TEXT.UPDATED_AT,
    width: '15%',
    render: timestampRenderer,
  },
  {
    field: 'attributes.enabled',
    name: TEXT.ENABLED,
    render: createRuleEnabledSwitchRenderer({ toggleRule }),
    width: '10%',
  },
];
