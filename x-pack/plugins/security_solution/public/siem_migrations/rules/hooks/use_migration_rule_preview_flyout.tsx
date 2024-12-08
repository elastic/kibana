/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useCallback, useState, useMemo } from 'react';
import type { EuiTabbedContentTab } from '@elastic/eui';
import type { RuleResponse } from '../../../../common/api/detection_engine';
import type {
  PrebuiltRuleVersion,
  RuleMigration,
} from '../../../../common/siem_migrations/model/rule_migration.gen';
import { MigrationRuleDetailsFlyout } from '../components/rule_details_flyout';

interface UseMigrationRuleDetailsFlyoutParams {
  prebuiltRules: PrebuiltRuleVersion[];
  ruleActionsFactory: (ruleMigration: RuleMigration, closeRulePreview: () => void) => ReactNode;
  extraTabsFactory?: (ruleMigration: RuleMigration) => EuiTabbedContentTab[];
}

interface UseMigrationRuleDetailsFlyoutResult {
  migrationRuleDetailsFlyout: ReactNode;
  openMigrationRuleDetails: (rule: RuleMigration) => void;
  closeMigrationRuleDetails: () => void;
}

export function useMigrationRuleDetailsFlyout({
  prebuiltRules,
  extraTabsFactory,
  ruleActionsFactory,
}: UseMigrationRuleDetailsFlyoutParams): UseMigrationRuleDetailsFlyoutResult {
  const [ruleMigration, setMigrationRuleForPreview] = useState<RuleMigration | undefined>();
  const [matchedPrebuiltRule, setMatchedPrebuiltRule] = useState<RuleResponse | undefined>();
  const closeMigrationRuleDetails = useCallback(() => setMigrationRuleForPreview(undefined), []);
  const ruleActions = useMemo(
    () => ruleMigration && ruleActionsFactory(ruleMigration, closeMigrationRuleDetails),
    [ruleMigration, ruleActionsFactory, closeMigrationRuleDetails]
  );
  const extraTabs = useMemo(
    () => (ruleMigration && extraTabsFactory ? extraTabsFactory(ruleMigration) : []),
    [ruleMigration, extraTabsFactory]
  );

  const openMigrationRuleDetails = useCallback(
    (rule: RuleMigration) => {
      setMigrationRuleForPreview(rule);

      // Find matched prebuilt rule if any and prioritize its installed version
      const matchedPrebuiltRuleVersion = prebuiltRules.find(
        (value) => value.target.rule_id === rule.elastic_rule?.prebuilt_rule_id
      );
      const prebuiltRule =
        matchedPrebuiltRuleVersion?.current ?? matchedPrebuiltRuleVersion?.target;
      setMatchedPrebuiltRule(prebuiltRule);
    },
    [prebuiltRules]
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
      />
    ),
    openMigrationRuleDetails,
    closeMigrationRuleDetails,
  };
}
