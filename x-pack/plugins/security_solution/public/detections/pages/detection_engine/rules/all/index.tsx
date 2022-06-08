/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React, { useState } from 'react';
import { CreatePreBuiltRules } from '../../../../containers/detection_engine/rules';
import { RulesTables } from './rules_tables';
import { AllRulesTabs, RulesTableToolbar } from './rules_table_toolbar';

interface AllRulesProps {
  createPrePackagedRules: CreatePreBuiltRules | null;
  hasPermissions: boolean;
  loading: boolean;
  loadingCreatePrePackagedRules: boolean;
  rulesCustomInstalled: number | null;
  rulesInstalled: number | null;
  rulesNotInstalled: number | null;
  rulesNotUpdated: number | null;
}

/**
 * Table Component for displaying all Rules for a given cluster. Provides the ability to filter
 * by name, sort by enabled, and perform the following actions:
 *   * Enable/Disable
 *   * Duplicate
 *   * Delete
 *   * Import/Export
 */
export const AllRules = React.memo<AllRulesProps>(
  ({
    createPrePackagedRules,
    hasPermissions,
    loading,
    loadingCreatePrePackagedRules,
    rulesCustomInstalled,
    rulesInstalled,
    rulesNotInstalled,
    rulesNotUpdated,
  }) => {
    const [activeTab, setActiveTab] = useState(AllRulesTabs.rules);

    return (
      <>
        <RulesTableToolbar activeTab={activeTab} onTabChange={setActiveTab} />
        <EuiSpacer />
        <RulesTables
          createPrePackagedRules={createPrePackagedRules}
          hasPermissions={hasPermissions}
          loading={loading}
          loadingCreatePrePackagedRules={loadingCreatePrePackagedRules}
          rulesCustomInstalled={rulesCustomInstalled}
          rulesInstalled={rulesInstalled}
          rulesNotInstalled={rulesNotInstalled}
          rulesNotUpdated={rulesNotUpdated}
          selectedTab={activeTab}
        />
      </>
    );
  }
);

AllRules.displayName = 'AllRules';
