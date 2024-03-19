/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import { PrePackagedRulesPrompt } from '../../../../detections/components/rules/pre_packaged_rules/load_empty_prompt';
import { useRouteSpy } from '../../../../common/utils/route/use_route_spy';
import { useRuleManagementFilters } from '../../../rule_management/logic/use_rule_management_filters';
import { AiRulesMonitoringPage } from '../../../rule_monitoring/pages/ai_rules_monitoring/ai_rules_monitoring_page';
import { RulesManagementTour } from './rules_table/guided_onboarding/rules_management_tour';
import { useSyncRulesTableSavedState } from './rules_table/use_sync_rules_table_saved_state';
import { RulesTables } from './rules_tables';
import { AllRulesTabs, RulesTableToolbar } from './rules_table_toolbar';
import { UpgradePrebuiltRulesTable } from './upgrade_prebuilt_rules_table/upgrade_prebuilt_rules_table';
import { UpgradePrebuiltRulesTableContextProvider } from './upgrade_prebuilt_rules_table/upgrade_prebuilt_rules_table_context';

/**
 * Table Component for displaying all Rules for a given cluster. Provides the ability to filter
 * by name, sort by enabled, and perform the following actions:
 *   * Enable/Disable
 *   * Duplicate
 *   * Delete
 *   * Import/Export
 */
export function AllRules(): JSX.Element {
  useSyncRulesTableSavedState();
  const [{ tabName }] = useRouteSpy();
  const { data: ruleManagementFilters } = useRuleManagementFilters();
  const hasNoRules =
    ruleManagementFilters?.rules_summary.custom_count === 0 &&
    ruleManagementFilters?.rules_summary.prebuilt_installed_count === 0;

  if (hasNoRules) {
    return (
      <>
        <RulesTableToolbar />
        <EuiSpacer />
        <PrePackagedRulesPrompt />
      </>
    );
  }

  switch (tabName) {
    case AllRulesTabs.management:
    case AllRulesTabs.monitoring:
      return (
        <>
          <RulesManagementTour />
          <RulesTableToolbar />
          <EuiSpacer />
          <RulesTables selectedTab={tabName} />
        </>
      );

    case AllRulesTabs.updates:
      return (
        <>
          <UpgradePrebuiltRulesTableContextProvider>
            <RulesTableToolbar />
            <EuiSpacer />
            <UpgradePrebuiltRulesTable />
          </UpgradePrebuiltRulesTableContextProvider>
        </>
      );

    case AllRulesTabs.aiMonitoring:
      return (
        <>
          <RulesTableToolbar />
          <EuiSpacer />
          <AiRulesMonitoringPage />
        </>
      );

    default:
      return <div>{'Not found'}</div>;
  }
}

AllRules.displayName = 'AllRules';
