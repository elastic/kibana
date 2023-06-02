/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiInMemoryTable, EuiSkeletonLoading, EuiProgress } from '@elastic/eui';
import React from 'react';

import * as i18n from '../../../../../detections/pages/detection_engine/rules/translations';
import { useIsUpgradingSecurityPackages } from '../../../../rule_management/logic/use_upgrade_security_packages';
import { useAddPrebuiltRulesTableContext } from './add_prebuilt_rules_table_context';

const NO_ITEMS_MESSAGE = (
  <EuiEmptyPrompt
    title={<h3>{i18n.NO_RULES_AVAILABLE_FOR_INSTALL}</h3>}
    titleSize="s"
    body={i18n.NO_RULES_AVAILABLE_FOR_INSTALL_BODY}
  />
);

/**
 * Table Component for displaying new rules that are available to be installed
 */
export const AddPrebuiltRulesTable = React.memo(() => {
  const isUpgradingSecurityPackages = useIsUpgradingSecurityPackages();

  const addRulesTableContext = useAddPrebuiltRulesTableContext();

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
    actions: { onTableChange },
  } = addRulesTableContext;

  const isTableEmpty = rules.length === 0;

  const tableProps = {
    'data-test-subj': 'add-prebuilt-rules-table',
    columns: rulesColumns,
  };

  const shouldShowLinearProgress = (isFetched && isRefetching) || isUpgradingSecurityPackages;
  const shouldShowLoadingOverlay = !isFetched && isRefetching;

  const shouldShowRulesTable = isFetched && !isTableEmpty;

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
      <EuiSkeletonLoading
        isLoading={isLoading || shouldShowLoadingOverlay}
        loadingContent={
          <EuiProgress
            data-test-subj="loadingRulesInfoProgress"
            size="xs"
            position="absolute"
            color="accent"
          />
        }
        loadedContent={
          <>
            {shouldShowRulesTable ? (
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

AddPrebuiltRulesTable.displayName = 'AddPrebuiltRulesTable';
