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
import { TranslationDetailsFlyout } from '../components/translation_details_flyout';

interface UseRulePreviewFlyoutParams {
  ruleActionsFactory: (ruleMigration: RuleMigration, closeRulePreview: () => void) => ReactNode;
  extraTabsFactory?: (ruleMigration: RuleMigration) => EuiTabbedContentTab[];
}

interface UseRulePreviewFlyoutResult {
  rulePreviewFlyout: ReactNode;
  openRulePreview: (rule: RuleMigration) => void;
  closeRulePreview: () => void;
}

export function useRulePreviewFlyout({
  extraTabsFactory,
  ruleActionsFactory,
}: UseRulePreviewFlyoutParams): UseRulePreviewFlyoutResult {
  const [ruleMigration, setRuleMigrationForPreview] = useState<RuleMigration | undefined>();
  const closeRulePreview = useCallback(() => setRuleMigrationForPreview(undefined), []);
  const ruleActions = useMemo(
    () => ruleMigration && ruleActionsFactory(ruleMigration, closeRulePreview),
    [ruleMigration, ruleActionsFactory, closeRulePreview]
  );
  const extraTabs = useMemo(
    () => (ruleMigration && extraTabsFactory ? extraTabsFactory(ruleMigration) : []),
    [ruleMigration, extraTabsFactory]
  );

  return {
    rulePreviewFlyout: ruleMigration && (
      <TranslationDetailsFlyout
        ruleMigration={ruleMigration}
        size="l"
        closeFlyout={closeRulePreview}
        ruleActions={ruleActions}
        extraTabs={extraTabs}
      />
    ),
    openRulePreview: useCallback((rule: RuleMigration) => {
      setRuleMigrationForPreview(rule);
    }, []),
    closeRulePreview,
  };
}
