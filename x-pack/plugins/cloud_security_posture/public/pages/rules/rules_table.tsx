/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import {
  Criteria,
  EuiButtonEmpty,
  EuiTableFieldDataColumnType,
  EuiBasicTable,
  EuiBasicTableProps,
  useEuiTheme,
  EuiSwitch,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTableSortingType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { uniqBy } from 'lodash';
import { ColumnNameWithTooltip } from '../../components/column_name_with_tooltip';
import * as TEST_SUBJECTS from './test_subjects';
import { CspBenchmarkRulesWithStates, useRules } from './rules_context';

export const RULES_ROWS_ENABLE_SWITCH_BUTTON = 'rules-row-enable-switch-button';
export const RULES_ROW_SELECT_ALL_CURRENT_PAGE = 'cloud-security-fields-selector-item-all';

interface RulesTableProps {
  onRuleClick: (ruleID: string) => void;
  selectedRuleId?: string;
}

type GetColumnProps = Pick<RulesTableProps, 'onRuleClick'> & {
  selectedRules: CspBenchmarkRulesWithStates[];
  setSelectedRules: (rules: CspBenchmarkRulesWithStates[]) => void;
  items: CspBenchmarkRulesWithStates[];
  setIsAllRulesSelectedThisPage: (isAllRulesSelected: boolean) => void;
  isAllRulesSelectedThisPage: boolean;
  isCurrentPageRulesASubset: (
    currentPageRulesArray: CspBenchmarkRulesWithStates[],
    selectedRulesArray: CspBenchmarkRulesWithStates[]
  ) => boolean;
};

export const RulesTable = ({ selectedRuleId, onRuleClick }: RulesTableProps) => {
  const { euiTheme } = useEuiTheme();
  const {
    page,
    setSelectedRules,
    selectedRules,
    rulesPageData,
    pageSize,
    setPageSize,
    sortOrder,
    setSortOrder,
  } = useRules();
  const items = rulesPageData.all_rules;
  const total = rulesPageData.total;
  const error = rulesPageData.error;
  const loading = rulesPageData.loading;

  const euiPagination: EuiBasicTableProps<CspBenchmarkRulesWithStates>['pagination'] = {
    pageIndex: page,
    pageSize,
    totalItemCount: total,
    pageSizeOptions: [10, 25, 100],
  };

  const sorting: EuiTableSortingType<CspBenchmarkRulesWithStates> = {
    sort: {
      field: 'metadata.benchmark.rule_number' as keyof CspBenchmarkRulesWithStates,
      direction: sortOrder,
    },
  };
  const onTableChange = ({ page: pagination, sort }: Criteria<CspBenchmarkRulesWithStates>) => {
    if (!pagination) return;
    if (pagination && (pagination.index !== page || pagination.size !== pageSize)) {
      setPageSize(pagination.size);
      setPageSize(pagination.index);
    }
    if (sort && sort.direction !== sortOrder) {
      setSortOrder(sort.direction);
    }
  };

  const rowProps = (row: CspBenchmarkRulesWithStates) => ({
    ['data-test-subj']: TEST_SUBJECTS.getCspBenchmarkRuleTableRowItemTestId(row.metadata?.id),
    style: {
      background: row.metadata?.id === selectedRuleId ? euiTheme.colors.highlight : undefined,
    },
  });

  const [isAllRulesSelectedThisPage, setIsAllRulesSelectedThisPage] = useState<boolean>(false);

  const isCurrentPageRulesASubset = (
    currentPageRulesArray: CspBenchmarkRulesWithStates[],
    selectedRulesArray: CspBenchmarkRulesWithStates[]
  ) => {
    let i: number = 0;
    const newCurrentPageRulesArray = currentPageRulesArray.map((rule) => rule.metadata);
    const newSelectedRulesArray = selectedRulesArray.map((rule) => rule.metadata);

    while (i < newCurrentPageRulesArray.length) {
      if (!newSelectedRulesArray.includes(newCurrentPageRulesArray[i])) return false;
      i++;
    }
    return true;
  };

  useEffect(() => {
    if (selectedRules.length >= items.length && items.length > 0 && selectedRules.length > 0)
      setIsAllRulesSelectedThisPage(true);
    else setIsAllRulesSelectedThisPage(false);
  }, [items.length, selectedRules.length]);

  const columns = getColumns({
    selectedRules,
    setSelectedRules,
    items,
    setIsAllRulesSelectedThisPage,
    isAllRulesSelectedThisPage,
    isCurrentPageRulesASubset,
    onRuleClick,
  });

  return (
    <>
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
        sorting={sorting}
      />
    </>
  );
};

const getColumns = ({
  selectedRules,
  setSelectedRules,
  items,
  isAllRulesSelectedThisPage,
  isCurrentPageRulesASubset,
  onRuleClick,
}: GetColumnProps): Array<EuiTableFieldDataColumnType<CspBenchmarkRulesWithStates>> => [
  {
    field: 'action',
    name: (
      <EuiCheckbox
        id={RULES_ROW_SELECT_ALL_CURRENT_PAGE}
        checked={isCurrentPageRulesASubset(items, selectedRules) && isAllRulesSelectedThisPage}
        onChange={() => {
          const uniqueSelectedRules = uniqBy([...selectedRules, ...items], 'metadata.id');
          const onChangeSelectAllThisPageFn = () => {
            setSelectedRules(uniqueSelectedRules);
          };
          const onChangeDeselectAllThisPageFn = () => {
            setSelectedRules(
              selectedRules.filter(
                (element: CspBenchmarkRulesWithStates) =>
                  !items.find(
                    (item: CspBenchmarkRulesWithStates) =>
                      item.metadata?.id === element.metadata?.id
                  )
              )
            );
          };
          return isCurrentPageRulesASubset(items, selectedRules) && isAllRulesSelectedThisPage
            ? onChangeDeselectAllThisPageFn()
            : onChangeSelectAllThisPageFn();
        }}
      />
    ),
    width: '40px',
    sortable: false,
    render: (_rules, item: CspBenchmarkRulesWithStates) => {
      return (
        <EuiCheckbox
          checked={selectedRules.some(
            (rule: CspBenchmarkRulesWithStates) => rule.metadata?.id === item.metadata?.id
          )}
          id={`cloud-security-fields-selector-item-${item.metadata?.id}`}
          data-test-subj={`cloud-security-fields-selector-item-${item.metadata?.id}`}
          onChange={(e) => {
            const isChecked = e.target.checked;
            return isChecked
              ? setSelectedRules([...selectedRules, item])
              : setSelectedRules(
                  selectedRules.filter(
                    (rule: CspBenchmarkRulesWithStates) => rule.metadata?.id !== item.metadata?.id
                  )
                );
          }}
        />
      );
    },
  },
  {
    field: 'metadata.benchmark.rule_number',
    name: i18n.translate('xpack.csp.rules.rulesTable.ruleNumberColumnLabel', {
      defaultMessage: 'Rule Number',
    }),
    width: '120px',
    sortable: true,
  },
  {
    field: 'metadata.name',
    name: i18n.translate('xpack.csp.rules.rulesTable.nameColumnLabel', {
      defaultMessage: 'Name',
    }),
    width: '60%',
    truncateText: true,
    render: (name, rule: CspBenchmarkRulesWithStates) => (
      <EuiButtonEmpty
        className="eui-textTruncate"
        title={name}
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation();
          onRuleClick(rule.metadata.id);
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
    width: '24%',
  },
  {
    field: 'metadata.name',
    name: (
      <ColumnNameWithTooltip
        columnName={i18n.translate('xpack.csp.rules.rulesTable.enabledColumnLabel', {
          defaultMessage: 'Enabled',
        })}
        tooltipContent={i18n.translate('xpack.csp.rules.rulesTable.enabledColumnTooltip', {
          defaultMessage: `Disabling a rule will also disable its associated detection rules and alerts. Enabling it again does not automatically re-enable them`,
        })}
      />
    ),
    align: 'right',
    width: '100px',
    truncateText: true,
    render: (_name, rule: CspBenchmarkRulesWithStates) => <RuleStateSwitch rule={rule} />,
  },
];

const RuleStateSwitch = ({ rule }: { rule: CspBenchmarkRulesWithStates }) => {
  const { toggleRuleState } = useRules();
  const isRuleMuted = rule?.state === 'muted';

  return (
    <EuiFlexGroup justifyContent="flexEnd">
      <EuiFlexItem grow={false}>
        <EuiSwitch
          className="eui-textTruncate"
          checked={!isRuleMuted}
          onChange={() => toggleRuleState(rule)}
          data-test-subj={RULES_ROWS_ENABLE_SWITCH_BUTTON}
          label=""
          compressed={true}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
