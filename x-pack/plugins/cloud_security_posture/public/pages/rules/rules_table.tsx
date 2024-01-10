/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Criteria,
  EuiButtonEmpty,
  EuiTableFieldDataColumnType,
  EuiBasicTable,
  EuiBasicTableProps,
  useEuiTheme,
  EuiSwitch,
  EuiCheckbox,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { uniqBy } from 'lodash';
// import { CspBenchmarkRule } from '../../../common/types/latest';
import type { CspBenchmarkRulesWithStatus, RulesState } from './rules_container';
import * as TEST_SUBJECTS from './test_subjects';
import { useChangeCspRuleStatus } from './change_csp_rule_status';

type RulesTableProps = Pick<
  RulesState,
  'loading' | 'error' | 'rules_page' | 'total' | 'perPage' | 'page'
> & {
  setPagination(pagination: Pick<RulesState, 'perPage' | 'page'>): void;
  setSelectedRuleId(id: string | null): void;
  selectedRuleId: string | null;
  refetchStatus: () => void;
  selectedRules: CspBenchmarkRulesWithStatus[];
  setSelectedRules: (e: CspBenchmarkRulesWithStatus[]) => void;
};

type GetColumnProps = Pick<
  RulesTableProps,
  'setSelectedRuleId' | 'refetchStatus' | 'selectedRules'
>;

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
  refetchStatus,
  selectedRules,
  setSelectedRules,
}: RulesTableProps) => {
  const { euiTheme } = useEuiTheme();
  const euiPagination: EuiBasicTableProps<CspBenchmarkRulesWithStatus>['pagination'] = {
    pageIndex: page,
    pageSize,
    totalItemCount: total,
    pageSizeOptions: [10, 25, 100],
  };

  const onTableChange = ({ page: pagination }: Criteria<CspBenchmarkRulesWithStatus>) => {
    if (!pagination) return;
    setPagination({ page: pagination.index, perPage: pagination.size });
  };

  const rowProps = (row: CspBenchmarkRulesWithStatus) => ({
    ['data-test-subj']: TEST_SUBJECTS.getCspBenchmarkRuleTableRowItemTestId(row.metadata?.id),
    style: {
      background: row.metadata?.id === selectedRuleId ? euiTheme.colors.highlight : undefined,
    },
  });

  const [selectAllRulesThisPage, setSelectAllRulesThisPage] = useState<boolean>(false);
  const postRequestChangeRulesStatus = useChangeCspRuleStatus();

  const isArraySubset = (
    smallArr: CspBenchmarkRulesWithStatus[],
    bigArr: CspBenchmarkRulesWithStatus[]
  ) => {
    let i: number = 0;
    const newSmallArr = smallArr.map((e) => e.metadata);
    const newBigArr = bigArr.map((e) => e.metadata);

    while (i < newSmallArr.length) {
      if (!newBigArr.includes(newSmallArr[i])) return false;
      i++;
    }
    return true;
  };

  useEffect(() => {
    if (selectedRules.length >= items.length) setSelectAllRulesThisPage(true);
  }, [items.length, selectedRules.length]);

  const columns = useMemo(
    () =>
      getColumns({
        setSelectedRuleId,
        refetchStatus,
        postRequestChangeRulesStatus,
        selectedRules,
        setSelectedRules,
        items,
        setSelectAllRulesThisPage,
        selectAllRulesThisPage,
        isArraySubset,
      }),
    [
      setSelectedRuleId,
      refetchStatus,
      postRequestChangeRulesStatus,
      selectedRules,
      setSelectedRules,
      items,
      setSelectAllRulesThisPage,
      selectAllRulesThisPage,
    ]
  );

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
      />
    </>
  );
};

const getColumns = ({
  setSelectedRuleId,
  refetchStatus,
  postRequestChangeRulesStatus,
  selectedRules,
  setSelectedRules,
  items,
  setSelectAllRulesThisPage,
  selectAllRulesThisPage,
  isArraySubset,
}: GetColumnProps & any): Array<EuiTableFieldDataColumnType<CspBenchmarkRulesWithStatus>> => [
  {
    field: 'action',
    name: (
      <EuiCheckbox
        id={`cloud-security-fields-selector-item-all`}
        checked={isArraySubset(items, selectedRules) && selectAllRulesThisPage}
        onChange={(e) => {
          const uniqueSelectedRules = uniqBy([...selectedRules, ...items], 'metadata.id');
          const onChangeSelectAllThisPageFn = () => {
            setSelectAllRulesThisPage(true);
            setSelectedRules(uniqueSelectedRules);
          };
          const onChangeDeselectAllThisPageFn = () => {
            setSelectAllRulesThisPage(false);
            setSelectedRules(
              selectedRules.filter(
                (element: CspBenchmarkRulesWithStatus) =>
                  !items.find(
                    (item: CspBenchmarkRulesWithStatus) =>
                      item.metadata?.id === element.metadata?.id
                  )
              )
            );
          };
          return isArraySubset(items, selectedRules) && selectAllRulesThisPage
            ? onChangeDeselectAllThisPageFn()
            : onChangeSelectAllThisPageFn();
        }}
      />
    ),
    width: '30px',
    sortable: false,
    render: (rules, item: CspBenchmarkRulesWithStatus) => {
      return (
        <EuiCheckbox
          checked={selectedRules.some(
            (e: CspBenchmarkRulesWithStatus) => e.metadata?.id === item.metadata?.id
          )}
          id={`cloud-security-fields-selector-item-${item.metadata?.id}`}
          data-test-subj={`cloud-security-fields-selector-item-${item.metadata?.id}`}
          onChange={(e) => {
            const isChecked = e.target.checked;
            return isChecked
              ? setSelectedRules([...selectedRules, item])
              : setSelectedRules(
                  selectedRules.filter(
                    (rule: CspBenchmarkRulesWithStatus) => rule.metadata?.id !== item.metadata?.id
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
    width: '10%',
    sortable: true,
  },
  {
    field: 'metadata.name',
    name: i18n.translate('xpack.csp.rules.rulesTable.nameColumnLabel', {
      defaultMessage: 'Name',
    }),
    width: '60%',
    truncateText: true,
    render: (name, rule: CspBenchmarkRulesWithStatus) => (
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
  {
    field: 'metadata.name',
    name: i18n.translate('xpack.csp.rules.rulesTable.mutedColumnLabel', {
      defaultMessage: 'Enabled',
    }),
    width: '10%',
    truncateText: true,
    render: (name, rule: CspBenchmarkRulesWithStatus) => {
      const rulesObjectRequest = {
        benchmark_id: rule?.metadata.benchmark.id,
        benchmark_version: rule?.metadata.benchmark.version,
        rule_number: rule?.metadata.benchmark.rule_number,
        rule_id: rule?.metadata.id,
      };
      const nextRuleStatus = rule?.status === 'muted' ? 'unmute' : 'mute';

      const useChangeCspRuleStatusFn = async () => {
        await postRequestChangeRulesStatus(nextRuleStatus, [rulesObjectRequest]);
        await refetchStatus();
      };
      return (
        <EuiSwitch
          className="eui-textTruncate"
          checked={rule?.status === 'muted' ? true : false}
          onChange={useChangeCspRuleStatusFn}
          data-test-subj={TEST_SUBJECTS.CSP_RULES_TABLE_ROW_ITEM_NAME}
          label=""
        />
      );
    },
  },
];
