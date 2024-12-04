/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useCallback, useState, useMemo } from 'react';
import type { EuiTabbedContentTab } from '@elastic/eui';
import type { RuleMigration } from '../../../../common/siem_migrations/model/rule_migration.gen';
import { MigrationRuleDetailsFlyout } from '../components/rule_details_flyout';

interface UseMigrationRuleDetailsFlyoutParams {
  ruleActionsFactory: (ruleMigration: RuleMigration, closeRulePreview: () => void) => ReactNode;
  extraTabsFactory?: (ruleMigration: RuleMigration) => EuiTabbedContentTab[];
}

interface UseMigrationRuleDetailsFlyoutResult {
  migrationRuleDetailsFlyout: ReactNode;
  openMigrationRuleDetails: (rule: RuleMigration) => void;
  closeMigrationRuleDetails: () => void;
}

export function useMigrationRuleDetailsFlyout({
  extraTabsFactory,
  ruleActionsFactory,
}: UseMigrationRuleDetailsFlyoutParams): UseMigrationRuleDetailsFlyoutResult {
  const [ruleMigration, setMigrationRuleForPreview] = useState<RuleMigration | undefined>();
  const closeMigrationRuleDetails = useCallback(() => setMigrationRuleForPreview(undefined), []);
  const ruleActions = useMemo(
    () => ruleMigration && ruleActionsFactory(ruleMigration, closeMigrationRuleDetails),
    [ruleMigration, ruleActionsFactory, closeMigrationRuleDetails]
  );
  const extraTabs = useMemo(
    () => (ruleMigration && extraTabsFactory ? extraTabsFactory(ruleMigration) : []),
    [ruleMigration, extraTabsFactory]
  );

  return {
    migrationRuleDetailsFlyout: ruleMigration && (
      <MigrationRuleDetailsFlyout
        ruleMigration={ruleMigration}
        size="l"
        closeFlyout={closeMigrationRuleDetails}
        ruleActions={ruleActions}
        extraTabs={extraTabs}
      />
    ),
    openMigrationRuleDetails: useCallback((rule: RuleMigration) => {
      setMigrationRuleForPreview(rule);
    }, []),
    closeMigrationRuleDetails,
  };
}
