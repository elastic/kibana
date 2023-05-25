/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiEmptyPrompt,
  EuiInMemoryTable,
  EuiSkeletonLoading,
  EuiLoadingSpinner,
  EuiProgress,
} from '@elastic/eui';
import React, { useCallback, useMemo, useRef } from 'react';
import { Loader } from '../../../../../common/components/loader';
import { PrePackagedRulesPrompt } from '../../../../../detections/components/rules/pre_packaged_rules/load_empty_prompt';

import * as i18n from '../../../../../detections/pages/detection_engine/rules/translations';
import { useRulesTableNewColumns } from './use_rules_table_new_columns';
import { useUserData } from '../../../../../detections/components/user_info';
import { hasUserCRUDPermission } from '../../../../../common/utils/privileges';
import { useIsUpgradingSecurityPackages } from '../../../../rule_management/logic/use_upgrade_security_packages';
import { useRulesTableNewContext } from './rules_table_new_context';
// import { AddRulesTableUtilityBar } from './add_rules_table_utility_bar';

const INITIAL_SORT_FIELD = 'enabled';

const NO_ITEMS_MESSAGE = (
  <EuiEmptyPrompt title={<h3>{i18n.NO_RULES}</h3>} titleSize="xs" body={i18n.NO_RULES_BODY} />
);

/**
 * Table Component for displaying new rules that are available to be installed
 */
export const RulesTableNew = React.memo(() => {
  const [{ canUserCRUD }] = useUserData();
  const hasPermissions = hasUserCRUDPermission(canUserCRUD);
  const isUpgradingSecurityPackages = useIsUpgradingSecurityPackages();

  const addRulesTableContext = useRulesTableNewContext();

  const {
    state: {
      tableRef,
      rules,
      pagination,
      selectionValue,
      // isSelectAllCalled,
      isPreflightInProgress,
      // isAllSelected,
      isFetched,
      isLoading,
      isRefetching,
      filters,
      // loadingRuleIds,
      // loadingRulesAction,
      // tags,
    },
    actions: {
      // setFilterOptions,
      // setIsAllSelected,
      // setSelectedRules,
      onTableChange,
    },
  } = addRulesTableContext;

  const rulesColumns = useRulesTableNewColumns({
    hasCRUDPermissions: hasPermissions,
  });

  // const toggleSelectAll = useCallback(() => {
  //   isSelectAllCalled.current = true;
  //   setIsAllSelected(!isAllSelected);
  //   setSelectedRules(!isAllSelected ? rules : []);
  // }, [isSelectAllCalled, setIsAllSelected, isAllSelected, setSelectedRules, rules]);

  const isTableEmpty = rules.length === 0;
  const shouldShowRulesTable = !isLoading && !isTableEmpty;

  const tableProps = {
    'data-test-subj': 'rules-updates-table',
    columns: rulesColumns,
  };

  const shouldShowLinearProgress = (isFetched && isRefetching) || isUpgradingSecurityPackages;
  const shouldShowLoadingOverlay = (!isFetched && isRefetching) || isPreflightInProgress;

  return (
    <>
      {shouldShowLinearProgress && (
        <EuiProgress
          data-test-subj="loadingRulesInfoProgress"
          size="xs"
          position="absolute"
          color="accent"
        />
      )}
      {shouldShowLoadingOverlay && (
        <Loader data-test-subj="loadingPanelAllRulesTable" overlay size="xl" />
      )}
      {isTableEmpty && <PrePackagedRulesPrompt />}
      <EuiSkeletonLoading
        isLoading={!shouldShowRulesTable}
        loadingContent={
          <EuiLoadingSpinner data-test-subj="loadingRulesInfoPanelAllRulesTable" size="xl" />
        }
        loadedContent={
          <>
            {/* <RulesTableFilters
                filterOptions={filterOptions}
                setFilterOptions={setFilterOptions}
                showRuleTypeStatusFilter={false}
              /> */}

            <EuiInMemoryTable
              ref={tableRef}
              items={rules}
              sorting={true}
              search={filters}
              pagination={pagination}
              isSelectable={true}
              onTableChange={onTableChange}
              selection={selectionValue}
              itemId="rule_id"
              // childrenBetween={
              //   <AddRulesTableUtilityBar
              //     canBulkEdit={hasPermissions}
              //     onGetBulkItemsPopoverContent={undefined}
              //     onToggleSelectAll={toggleSelectAll}
              //     isBulkActionInProgress={false}
              //   />
              // }
              {...tableProps}
            />
          </>
        }
      />
    </>
  );
});

RulesTableNew.displayName = 'RulesTableNew';
