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
import React from 'react';
import { PrePackagedRulesPrompt } from '../../../../../detections/components/rules/pre_packaged_rules/load_empty_prompt';

import * as i18n from '../../../../../detections/pages/detection_engine/rules/translations';
import { useRulesTableNewColumns } from './use_rules_table_new_columns';
import { useUserData } from '../../../../../detections/components/user_info';
import { hasUserCRUDPermission } from '../../../../../common/utils/privileges';
import { useIsUpgradingSecurityPackages } from '../../../../rule_management/logic/use_upgrade_security_packages';
import { useRulesTableNewContext } from './rules_table_new_context';

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
    state: { rules, pagination, selectionValue, filters, isFetched, isLoading, isRefetching },
    actions: { reFetchRules, onTableChange },
  } = addRulesTableContext;

  const rulesColumns = useRulesTableNewColumns({
    hasCRUDPermissions: hasPermissions,
  });

  const isTableEmpty = rules.length === 0;
  const shouldShowRulesTable = !isLoading && !isTableEmpty;

  const tableProps = {
    'data-test-subj': 'rules-updates-table',
    columns: rulesColumns,
  };

  const shouldShowLinearProgress = (isFetched && isRefetching) || isUpgradingSecurityPackages;
  const shouldShowLoadingOverlay = !isFetched && isRefetching;

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
      {isFetched && isTableEmpty && <PrePackagedRulesPrompt />}
      <EuiSkeletonLoading
        isLoading={shouldShowLoadingOverlay && !shouldShowRulesTable}
        loadingContent={
          <EuiLoadingSpinner data-test-subj="loadingRulesInfoPanelAllRulesTable" size="xl" />
        }
        loadedContent={
          <>
            {!isTableEmpty ? (
              <EuiInMemoryTable
                items={rules}
                sorting={true}
                search={filters}
                pagination={pagination}
                isSelectable={true}
                onTableChange={onTableChange}
                selection={selectionValue}
                itemId="rule_id"
                {...tableProps}
              />
            ) : null}
          </>
        }
      />
    </>
  );
});

RulesTableNew.displayName = 'RulesTableNew';
