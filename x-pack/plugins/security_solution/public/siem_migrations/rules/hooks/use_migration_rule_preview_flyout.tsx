/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useCallback, useState, useMemo } from 'react';
import type { EuiTabbedContentTab } from '@elastic/eui';
import type {
  PrebuiltRuleVersion,
  RuleMigration,
} from '../../../../common/siem_migrations/model/rule_migration.gen';
import { MigrationRuleDetailsFlyout } from '../components/rule_details_flyout';

interface UseMigrationRuleDetailsFlyoutParams {
  isLoading?: boolean;
  prebuiltRules: Record<string, PrebuiltRuleVersion>;
  getMigrationRule: (ruleId: string) => RuleMigration | undefined;
  ruleActionsFactory: (ruleMigration: RuleMigration, closeRulePreview: () => void) => ReactNode;
  extraTabsFactory?: (ruleMigration: RuleMigration) => EuiTabbedContentTab[];
}

interface UseMigrationRuleDetailsFlyoutResult {
  migrationRuleDetailsFlyout: ReactNode;
  openMigrationRuleDetails: (rule: RuleMigration) => void;
  closeMigrationRuleDetails: () => void;
}

export function useMigrationRuleDetailsFlyout({
  isLoading,
  prebuiltRules,
  getMigrationRule,
  extraTabsFactory,
  ruleActionsFactory,
}: UseMigrationRuleDetailsFlyoutParams): UseMigrationRuleDetailsFlyoutResult {
  const [migrationRuleId, setMigrationRuleId] = useState<string | undefined>();

  const ruleMigration = useMemo(() => {
    if (migrationRuleId) {
      return getMigrationRule(migrationRuleId);
    }
  }, [getMigrationRule, migrationRuleId]);
  const matchedPrebuiltRule = useMemo(() => {
    if (ruleMigration) {
      // Find matched prebuilt rule if any and prioritize its installed version
      const matchedPrebuiltRuleVersion = ruleMigration.elastic_rule?.prebuilt_rule_id
        ? prebuiltRules[ruleMigration.elastic_rule.prebuilt_rule_id]
        : undefined;
      return matchedPrebuiltRuleVersion?.current ?? matchedPrebuiltRuleVersion?.target;
    }
  }, [prebuiltRules, ruleMigration]);

  const openMigrationRuleDetails = useCallback((rule: RuleMigration) => {
    setMigrationRuleId(rule.id);
  }, []);
  const closeMigrationRuleDetails = useCallback(() => setMigrationRuleId(undefined), []);

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
        matchedPrebuiltRule={matchedPrebuiltRule}
        size="l"
        closeFlyout={closeMigrationRuleDetails}
        ruleActions={ruleActions}
        extraTabs={extraTabs}
        isDataLoading={isLoading}
      />
    ),
    openMigrationRuleDetails,
    closeMigrationRuleDetails,
  };
}
