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
import { useIsUpgradingSecurityPackages } from '../../../../rule_management/logic/use_upgrade_security_packages';
import { useUpgradePrebuiltRulesTableContext } from './upgrade_prebuilt_rules_table_context';

const NO_ITEMS_MESSAGE = (
  <EuiEmptyPrompt title={<h3>{i18n.NO_RULES}</h3>} titleSize="xs" body={i18n.NO_RULES_BODY} />
);

/**
 * Table Component for displaying rules that have available updates
 */
export const UpgradePrebuiltRulesTable = React.memo(() => {
  const isUpgradingSecurityPackages = useIsUpgradingSecurityPackages();

  const upgradeRulesTableContext = useUpgradePrebuiltRulesTableContext();

  const {
    state: {
      rules,
      pagination,
      selectionValue,
      filters,
      isFetched,
      isLoading,
      isRefetching,
      rulesColumns,
    },
    actions: { reFetchRules, onTableChange },
  } = upgradeRulesTableContext;

  const isTableEmpty = rules.length === 0;
  const shouldShowRulesTable = !isLoading && !isTableEmpty;

  const tableProps = {
    'data-test-subj': 'rules-upgrades-table',
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
            ) : (
              NO_ITEMS_MESSAGE
            )}
          </>
        }
      />
    </>
  );
});

UpgradePrebuiltRulesTable.displayName = 'UpgradePrebuiltRulesTable';
