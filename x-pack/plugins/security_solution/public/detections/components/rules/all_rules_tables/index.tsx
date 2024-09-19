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
  RulesColumns,
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
  euiBasicTableSelectionProps: EuiTableSelectionType<Rule>;
  hasPermissions: boolean;
  monitoringColumns: Array<EuiBasicTableColumn<RuleStatusRowItemType>>;
  pagination: {
    pageIndex: number;
    pageSize: number;
    totalItemCount: number;
    pageSizeOptions: number[];
  };
  rules: Rules;
  rulesColumns: RulesColumns[];
  rulesStatuses: RuleStatusRowItemType[];
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
  rules,
  rulesColumns,
  rulesStatuses,
  sorting,
  tableOnChangeCallback,
  tableRef,
  selectedTab,
}) => {
  return (
    <>
      {selectedTab === AllRulesTabs.rules && (
        <EuiBasicTable
          data-test-subj="rules-table"
          columns={rulesColumns}
          isSelectable={hasPermissions}
          itemId="id"
          items={rules ?? []}
          noItemsMessage={emptyPrompt}
          onChange={tableOnChangeCallback}
          pagination={pagination}
          ref={tableRef}
          sorting={sorting}
          selection={hasPermissions ? euiBasicTableSelectionProps : undefined}
        />
      )}
      {selectedTab === AllRulesTabs.monitoring && (
        <EuiBasicTable
          data-test-subj="monitoring-table"
          columns={monitoringColumns}
          isSelectable={hasPermissions}
          itemId="id"
          items={rulesStatuses}
          noItemsMessage={emptyPrompt}
          onChange={tableOnChangeCallback}
          pagination={pagination}
        />
      )}
    </>
  );
};

export const AllRulesTables = memo(AllRulesTablesComponent);
