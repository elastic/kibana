/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiInMemoryTable, EuiLoadingContent, EuiProgress } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { Loader } from '../../../../../common/components/loader';
import { PrePackagedRulesPrompt } from '../../../../../detections/components/rules/pre_packaged_rules/load_empty_prompt';
import type { Rule } from '../../../../rule_management/logic';
import * as i18n from '../../../../../detections/pages/detection_engine/rules/translations';
import type { EuiBasicTableOnChange } from '../../../../../detections/pages/detection_engine/rules/types';
import { RulesTableFilters } from '../rules_table_filters/rules_table_filters';
import { useRulesTableNewColumns } from './use_rules_table_new_columns';
import { useUserData } from '../../../../../detections/components/user_info';
import { hasUserCRUDPermission } from '../../../../../common/utils/privileges';
import { RULES_TABLE_PAGE_SIZE_OPTIONS } from '../constants';
import type { FindRulesSortField } from '../../../../../../common/detection_engine/rule_management';
import { useIsUpgradingSecurityPackages } from '../../../../rule_management/logic/use_upgrade_security_packages';
import { useRulesTableNewContext } from './rules_table_new_context';

const INITIAL_SORT_FIELD = 'enabled';

interface RulesTableNewProps {}

const NO_ITEMS_MESSAGE = (
  <EuiEmptyPrompt title={<h3>{i18n.NO_RULES}</h3>} titleSize="xs" body={i18n.NO_RULES_BODY} />
);

/**
 * Table Component for displaying new rules that are available to be installed
 */
export const RulesTableNew = React.memo<RulesTableNewProps>(({}) => {
  const [{ canUserCRUD }] = useUserData();
  const hasPermissions = hasUserCRUDPermission(canUserCRUD);
  const isUpgradingSecurityPackages = useIsUpgradingSecurityPackages();

  const rulesTableContext = useRulesTableNewContext();

  const {
    state: {
      rules,
      filterOptions,
      isPreflightInProgress,
      isAllSelected,
      isFetched,
      isLoading,
      isRefetching,
      loadingRuleIds,
      loadingRulesAction,
      pagination,
      selectedRuleIds,
      sortingOptions,
      tags,
    },
    actions: {
      setFilterOptions,
      setIsAllSelected,
      setPage,
      setPerPage,
      setSelectedRuleIds,
      setSortingOptions,
    },
  } = rulesTableContext;

  const paginationMemo = useMemo(() => {
    return {
      pageIndex: 0,
      pageSize: 20,
      totalItemCount: rules.length,
      pageSizeOptions: RULES_TABLE_PAGE_SIZE_OPTIONS,
    };
  }, [pagination]);

  const tableOnChangeCallback = useCallback(
    ({ page, sort }: EuiBasicTableOnChange) => {
      setSortingOptions({
        field: (sort?.field as FindRulesSortField) ?? INITIAL_SORT_FIELD, // Narrowing EuiBasicTable sorting types
        order: sort?.direction ?? 'desc',
      });
      setPage(page.index + 1);
      setPerPage(page.size);
    },
    [setPage, setPerPage, setSortingOptions]
  );

  const rulesColumns = useRulesTableNewColumns({
    hasCRUDPermissions: hasPermissions,
  });

  // const isSelectAllCalled = useRef(false);

  // const toggleSelectAll = useCallback(() => {
  //   isSelectAllCalled.current = true;
  //   setIsAllSelected(!isAllSelected);
  //   setSelectedRuleIds(!isAllSelected ? rules.map(({ id }) => id) : []);
  // }, [rules, isAllSelected, setIsAllSelected, setSelectedRuleIds]);

  const isTableEmpty = rules.length === 0;
  const shouldShowRulesTable = !isLoading && !isTableEmpty;

  let tableProps;

  tableProps = {
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
      {isLoading && (
        <EuiLoadingContent data-test-subj="initialLoadingPanelAllRulesTable" lines={10} />
      )}
      {shouldShowRulesTable && (
        <>
          <RulesTableFilters
            filterOptions={filterOptions}
            setFilterOptions={setFilterOptions}
            showRuleTypeStatusFilter={false}
          />
          {/* TODO: Still relies on old context*/}
          {/* <RulesTableUtilityBar*/}
          {/*  canBulkEdit={hasPermissions}*/}
          {/*  onGetBulkItemsPopoverContent={undefined}*/}
          {/*  onToggleSelectAll={undefined}*/}
          {/*  isBulkActionInProgress={false}*/}
          {/* />*/}
          <EuiInMemoryTable
            items={rules}
            isSelectable={false}
            sorting={{
              sort: {
                // EuiBasicTable has incorrect `sort.field` types which accept only `keyof Item` and reject fields in dot notation
                field: sortingOptions.field as keyof Rule,
                direction: sortingOptions.order,
              },
            }}
            pagination={paginationMemo}
            {...tableProps}
          />
          {/* <EuiBasicTable*/}
          {/*  itemId="id"*/}
          {/*  items={rules}*/}
          {/*  isSelectable={false}*/}
          {/*  noItemsMessage={NO_ITEMS_MESSAGE}*/}
          {/*  onChange={tableOnChangeCallback}*/}
          {/*  pagination={paginationMemo}*/}
          {/*  selection={undefined}*/}
          {/*  sorting={{*/}
          {/*    sort: {*/}
          {/*      // EuiBasicTable has incorrect `sort.field` types which accept only `keyof Item` and reject fields in dot notation*/}
          {/*      field: sortingOptions.field as keyof Rule,*/}
          {/*      direction: sortingOptions.order,*/}
          {/*    },*/}
          {/*  }}*/}
          {/*  {...tableProps}*/}
          {/* />*/}
        </>
      )}
    </>
  );
});

RulesTableNew.displayName = 'RulesTableNew';
