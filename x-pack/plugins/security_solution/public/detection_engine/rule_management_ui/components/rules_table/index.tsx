/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React, { useState } from 'react';
import { RulesTables } from './rules_tables';
import { AllRulesTabs, RulesTableToolbar } from './rules_table_toolbar';

/**
 * Table Component for displaying all Rules for a given cluster. Provides the ability to filter
 * by name, sort by enabled, and perform the following actions:
 *   * Enable/Disable
 *   * Duplicate
 *   * Delete
 *   * Import/Export
 */
export const AllRules = React.memo(() => {
  const [activeTab, setActiveTab] = useState(AllRulesTabs.rules);

  return (
    <>
      <RulesTableToolbar activeTab={activeTab} onTabChange={setActiveTab} />
      <EuiSpacer />
      <RulesTables selectedTab={activeTab} />
    </>
  );
});

AllRules.displayName = 'AllRules';
