/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiDataGridColumn,
  EuiTableActionsColumnType,
  EuiTableComputedColumnType,
  EuiTableFieldDataColumnType,
  useDataGridColumnSelector,
} from '@elastic/eui';
import React, { useMemo, useState } from 'react';
import { useKibana } from '../../../../common/lib/kibana';
import { RuleTableItem } from '../../../../types';

type RulesListTableColumns =
  | EuiTableFieldDataColumnType<RuleTableItem>
  | EuiTableComputedColumnType<RuleTableItem>
  | EuiTableActionsColumnType<RuleTableItem>;

export type RulesListColumns = {
  id?: RulesListVisibleColumns;
  selectorName?: string;
} & RulesListTableColumns;

export type RulesListVisibleColumns =
  | 'ruleName'
  | 'ruleTags'
  | 'ruleExecutionStatusLastDate'
  | 'ruleSnoozeNotify'
  | 'ruleScheduleInterval'
  | 'ruleExecutionStatusLastDuration'
  | 'ruleExecutionPercentile'
  | 'ruleExecutionSuccessRatio'
  | 'ruleExecutionStatus'
  | 'ruleExecutionState';

const OriginalRulesListVisibleColumns: RulesListVisibleColumns[] = [
  'ruleName',
  'ruleTags',
  'ruleExecutionStatusLastDate',
  'ruleSnoozeNotify',
  'ruleScheduleInterval',
  'ruleExecutionStatusLastDuration',
  'ruleExecutionPercentile',
  'ruleExecutionSuccessRatio',
  'ruleExecutionStatus',
  'ruleExecutionState',
];

interface RulesListColumnSelector {
  allRuleColumns: RulesListColumns[];
  rulesListKey?: string;
  visibleColumns?: RulesListVisibleColumns[];
}

type UseRulesListColumnSelector = [RulesListTableColumns[], React.ReactNode];

const RULES_LIST_COLUMNS_KEY = 'triggersActionsUi_rulesListColumns';

export const useRulesListColumnSelector = ({
  allRuleColumns,
  rulesListKey = RULES_LIST_COLUMNS_KEY,
  visibleColumns = OriginalRulesListVisibleColumns,
}: RulesListColumnSelector): UseRulesListColumnSelector => {
  const { storage } = useKibana().services;
  const storageVisibleColumns = storage?.get(rulesListKey);
  const [localVisibleColumns, setLocalVisibleColumns] = useState<string[]>(
    storageVisibleColumns ?? visibleColumns
  );

  const rulesColumns = useMemo(() => {
    const columnsToAddAtTheEnd = allRuleColumns.filter((col) => col.id === undefined);
    const columns = localVisibleColumns.map((coldId) => {
      const { id, selectorName, ...colAttr } = allRuleColumns.find((col) => col.id === coldId) ?? {
        id: '',
        selectorName: '',
      };
      return colAttr as RulesListTableColumns;
    });
    columns.push(...columnsToAddAtTheEnd);
    return columns;
  }, [allRuleColumns, localVisibleColumns]);

  const rulesListColumnSelector = useMemo(
    () =>
      allRuleColumns
        .filter((col) => col.id != null)
        .map((col) => ({ id: col.id })) as EuiDataGridColumn[],
    [allRuleColumns]
  );

  const rulesListColumnVisibility = useMemo(
    () => ({
      visibleColumns: localVisibleColumns,
      setVisibleColumns: (col: string[]) => {
        if (rulesListKey) {
          storage?.set(rulesListKey, col);
        }
        setLocalVisibleColumns(col);
      },
    }),
    [localVisibleColumns, rulesListKey, storage]
  );

  const rulesListColumnsSelectorDisplayValues = useMemo(
    () =>
      allRuleColumns
        .filter((col) => col.id != null)
        .reduce((acc, { id, name, selectorName }) => {
          if (id) {
            return {
              ...acc,
              [id]: selectorName ?? name,
            };
          }
          return acc;
        }, {}),
    [allRuleColumns]
  );

  const [ColumnSelector] = useDataGridColumnSelector(
    rulesListColumnSelector,
    rulesListColumnVisibility,
    true,
    rulesListColumnsSelectorDisplayValues
  );

  return useMemo(() => [rulesColumns, ColumnSelector], [ColumnSelector, rulesColumns]);
};
