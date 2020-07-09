/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiEmptyPrompt,
  Direction,
  EuiTableSelectionType,
} from '@elastic/eui';
import React, { useMemo, memo } from 'react';
import styled from 'styled-components';

import { EuiBasicTableOnChange } from '../../../pages/detection_engine/rules/types';
import * as i18n from '../../../pages/detection_engine/rules/translations';
import {
  RulesColumns,
  RuleStatusRowItemType,
} from '../../../pages/detection_engine/rules/all/columns';
import { Rule, Rules } from '../../../containers/detection_engine/rules/types';
import { AllRulesTabs } from '../../../pages/detection_engine/rules/all';

// EuiBasicTable give me a hardtime with adding the ref attributes so I went the easy way
// after few hours of fight with typescript !!!! I lost :(
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MyEuiBasicTable = styled(EuiBasicTable as any)`` as any;

export interface SortingType {
  sort: {
    field: 'enabled';
    direction: Direction;
  };
}

interface AllRulesTablesProps {
  euiBasicTableSelectionProps: EuiTableSelectionType<Rule>;
  hasNoPermissions: boolean;
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
  sorting: {
    sort: {
      field: 'enabled';
      direction: Direction;
    };
  };
  tableOnChangeCallback: ({ page, sort }: EuiBasicTableOnChange) => void;
  tableRef?: React.MutableRefObject<EuiBasicTable | undefined>;
  selectedTab: AllRulesTabs;
}

export const AllRulesTablesComponent: React.FC<AllRulesTablesProps> = ({
  euiBasicTableSelectionProps,
  hasNoPermissions,
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
  const emptyPrompt = useMemo(() => {
    return (
      <EuiEmptyPrompt title={<h3>{i18n.NO_RULES}</h3>} titleSize="xs" body={i18n.NO_RULES_BODY} />
    );
  }, []);

  return (
    <>
      {selectedTab === AllRulesTabs.rules && (
        <MyEuiBasicTable
          data-test-subj="rules-table"
          columns={rulesColumns}
          isSelectable={!hasNoPermissions ?? false}
          itemId="id"
          items={rules ?? []}
          noItemsMessage={emptyPrompt}
          onChange={tableOnChangeCallback}
          pagination={pagination}
          ref={tableRef}
          sorting={sorting}
          selection={hasNoPermissions ? undefined : euiBasicTableSelectionProps}
        />
      )}
      {selectedTab === AllRulesTabs.monitoring && (
        <MyEuiBasicTable
          data-test-subj="monitoring-table"
          columns={monitoringColumns}
          isSelectable={!hasNoPermissions ?? false}
          itemId="id"
          items={rulesStatuses}
          noItemsMessage={emptyPrompt}
          onChange={tableOnChangeCallback}
          pagination={pagination}
          sorting={sorting}
        />
      )}
    </>
  );
};

export const AllRulesTables = memo(AllRulesTablesComponent);
