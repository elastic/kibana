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
import { invariant } from '../../../../common/utils/invariant';
import type { RuleSignatureId } from '../../../../common/api/detection_engine';
import { TranslationDetailsFlyout } from './translation_details/translation_details_flyout';

interface UseSiemMigrationsPreviewFlyoutParams {
  ruleMigrations: RuleMigration[];
  ruleActionsFactory: (
    ruleMigration: RuleMigration,
    closeRuleMigrationPreview: () => void
  ) => ReactNode;
  extraTabsFactory?: (ruleMigration: RuleMigration) => EuiTabbedContentTab[];
  flyoutProps: SiemMigrationsPreviewFlyoutProps;
}

interface SiemMigrationsPreviewFlyoutProps {
  /**
   * Rule preview flyout unique id used in HTML
   */
  id: string;
  dataTestSubj: string;
}

interface UseSiemMigrationsPreviewFlyoutResult {
  ruleMigrationPreviewFlyout: ReactNode;
  openRuleTranslationPreview: (ruleId: RuleSignatureId) => void;
  closeRuleMigrationPreview: () => void;
}

export function useSiemMigrationsPreviewFlyout({
  ruleMigrations,
  extraTabsFactory,
  ruleActionsFactory,
  flyoutProps,
}: UseSiemMigrationsPreviewFlyoutParams): UseSiemMigrationsPreviewFlyoutResult {
  const [ruleMigration, setRuleMigrationForPreview] = useState<RuleMigration | undefined>();
  const closeRuleMigrationPreview = useCallback(() => setRuleMigrationForPreview(undefined), []);
  const ruleActions = useMemo(
    () => ruleMigration && ruleActionsFactory(ruleMigration, closeRuleMigrationPreview),
    [ruleMigration, ruleActionsFactory, closeRuleMigrationPreview]
  );
  const extraTabs = useMemo(
    () => (ruleMigration && extraTabsFactory ? extraTabsFactory(ruleMigration) : []),
    [ruleMigration, extraTabsFactory]
  );

  return {
    ruleMigrationPreviewFlyout: ruleMigration && (
      <TranslationDetailsFlyout
        ruleMigration={ruleMigration}
        size="l"
        id={flyoutProps.id}
        dataTestSubj={flyoutProps.dataTestSubj}
        closeFlyout={closeRuleMigrationPreview}
        ruleActions={ruleActions}
        extraTabs={extraTabs}
      />
    ),
    openRuleTranslationPreview: useCallback(
      (ruleId: RuleSignatureId) => {
        const ruleMigrationToShowInFlyout = ruleMigrations.find(
          (x) => x.original_rule.id === ruleId
        );

        invariant(ruleMigrationToShowInFlyout, `Rule migration with id ${ruleId} not found`);
        setRuleMigrationForPreview(ruleMigrationToShowInFlyout);
      },
      [ruleMigrations]
    ),
    closeRuleMigrationPreview,
  };
}
