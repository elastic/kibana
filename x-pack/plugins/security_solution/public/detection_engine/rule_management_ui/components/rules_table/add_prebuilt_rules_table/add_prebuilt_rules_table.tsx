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
  EuiProgress,
  EuiSkeletonTitle,
  EuiSkeletonText,
} from '@elastic/eui';
import React from 'react';

import * as i18n from '../../../../../detections/pages/detection_engine/rules/translations';
import { useIsUpgradingSecurityPackages } from '../../../../rule_management/logic/use_upgrade_security_packages';
import { RULES_TABLE_INITIAL_PAGE_SIZE, RULES_TABLE_PAGE_SIZE_OPTIONS } from '../constants';
import { useAddPrebuiltRulesTableContext } from './add_prebuilt_rules_table_context';
import { useAddPrebuiltRulesTableColumns } from './use_add_prebuilt_rules_table_columns';

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
    state: { rules, tags, isFetched, isLoading, isRefetching, selectedRules },
    actions: { selectRules },
  } = addRulesTableContext;
  const rulesColumns = useAddPrebuiltRulesTableColumns();

  const isTableEmpty = isFetched && rules.length === 0;

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
      <EuiSkeletonLoading
        isLoading={isLoading || shouldShowLoadingOverlay}
        loadingContent={
          <>
            <EuiSkeletonTitle />
            <EuiSkeletonText />
          </>
        }
        loadedContent={
          isTableEmpty ? (
            NO_ITEMS_MESSAGE
          ) : (
            <EuiInMemoryTable
              items={rules}
              sorting
              search={{
                box: {
                  incremental: true,
                  isClearable: true,
                },
                filters: [
                  {
                    type: 'field_value_selection',
                    field: 'tags',
                    name: 'Tags',
                    multiSelect: true,
                    options: tags.map((tag) => ({
                      value: tag,
                      name: tag,
                      field: 'tags',
                    })),
                  },
                ],
              }}
              pagination={{
                initialPageSize: RULES_TABLE_INITIAL_PAGE_SIZE,
                pageSizeOptions: RULES_TABLE_PAGE_SIZE_OPTIONS,
              }}
              isSelectable
              selection={{
                selectable: () => true,
                onSelectionChange: selectRules,
                initialSelected: selectedRules,
              }}
              itemId="rule_id"
              data-test-subj="add-prebuilt-rules-table"
              columns={rulesColumns}
            />
          )
        }
      />
    </>
  );
});

AddPrebuiltRulesTable.displayName = 'AddPrebuiltRulesTable';
