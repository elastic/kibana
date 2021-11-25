/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Direction,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiEmptyPrompt,
  EuiTableSelectionType,
} from '@elastic/eui';

import React, { memo } from 'react';
import { Rule, Rules, RulesSortingFields } from '../../../containers/detection_engine/rules/types';
import { AllRulesTabs } from '../../../pages/detection_engine/rules/all';
import {
  TableRow,
  TableColumn,
  RuleStatusRowItemType,
} from '../../../pages/detection_engine/rules/all/columns';
import * as i18n from '../../../pages/detection_engine/rules/translations';
import { EuiBasicTableOnChange } from '../../../pages/detection_engine/rules/types';

export interface SortingType {
  sort: {
    field: RulesSortingFields;
    direction: Direction;
  };
}

interface AllRulesTablesProps {
  euiBasicTableSelectionProps: EuiTableSelectionType<TableRow>;
  hasPermissions: boolean;
  monitoringColumns: TableColumn[];
  pagination: {
    pageIndex: number;
    pageSize: number;
    totalItemCount: number;
    pageSizeOptions: number[];
  };
  items: TableRow[];
  // rules: Rules;
  rulesColumns: TableColumn[];
  // rulesStatuses: RuleStatusRowItemType[];
  sorting: SortingType;
  tableOnChangeCallback: ({ page, sort }: EuiBasicTableOnChange) => void;
  tableRef?: React.MutableRefObject<EuiBasicTable | null>;
  selectedTab: AllRulesTabs;
}

const emptyPrompt = (
  <EuiEmptyPrompt title={<h3>{i18n.NO_RULES}</h3>} titleSize="xs" body={i18n.NO_RULES_BODY} />
);

export const AllRulesTablesComponent: React.FC<AllRulesTablesProps> = ({
  euiBasicTableSelectionProps,
  hasPermissions,
  monitoringColumns,
  pagination,
  items,
  rulesColumns,
  sorting,
  tableOnChangeCallback,
  tableRef,
  selectedTab,
}) => {
  const selection = hasPermissions ? euiBasicTableSelectionProps : undefined;
  const commonProps = {
    isSelectable: hasPermissions,
    noItemsMessage: emptyPrompt,
    onChange: tableOnChangeCallback,
    pagination,
    ref: tableRef,
    itemId: 'id',
    items,
    selection,
  };
  const props =
    selectedTab === AllRulesTabs.rules
      ? {
          dataTestSubj: 'rules-table',
          columns: rulesColumns,
          sorting,
        }
      : { dataTestSubj: 'monitoring-table', columns: monitoringColumns };
  return <EuiBasicTable {...commonProps} {...props} />;
  // return (
  //   <>
  //     {selectedTab === AllRulesTabs.rules && (
  //       <EuiBasicTable
  //         data-test-subj="rules-table"
  //         columns={rulesColumns}
  //         itemId="id"
  //         items={rules ?? []}
  //         sorting={sorting}
  //         selection={selection as EuiTableSelectionType<Rule>}
  //         {...commonProps}
  //       />
  //     )}
  //     {selectedTab === AllRulesTabs.monitoring && (
  //       <EuiBasicTable
  //         data-test-subj="monitoring-table"
  //         columns={monitoringColumns}
  //         itemId="id"
  //         items={rulesStatuses}
  //         selection={selection as EuiTableSelectionType<RuleStatusRowItemType>}
  //         {...commonProps}
  //       />
  //     )}
  //   </>
  // );
};

export const AllRulesTables = memo(AllRulesTablesComponent);
