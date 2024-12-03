/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useCallback, useState, useMemo } from 'react';
import type { EuiTabbedContentTab } from '@elastic/eui';
import { invariant } from '../../../../../../common/utils/invariant';
import type { RuleSignatureId } from '../../../../../../common/api/detection_engine';
import { RuleDetailsFlyout } from '../../../../rule_management/components/rule_details/rule_details_flyout';

interface RuleLike {
  rule_id: RuleSignatureId;
}

interface UseRulePreviewFlyoutParams<T extends RuleLike> {
  rules: T[];
  ruleActionsFactory: (rule: T, closeRulePreview: () => void) => ReactNode;
  extraTabsFactory?: (rule: T) => EuiTabbedContentTab[];
  subHeaderFactory?: (rule: T) => ReactNode;
  flyoutProps: RulePreviewFlyoutProps;
}

interface RulePreviewFlyoutProps {
  /**
   * Rule preview flyout unique id used in HTML
   */
  id: string;
  dataTestSubj: string;
}

interface UseRulePreviewFlyoutResult<T extends RuleLike> {
  rulePreviewFlyout: ReactNode;
  openRulePreview: (ruleId: RuleSignatureId) => void;
  closeRulePreview: () => void;
}

export function useRulePreviewFlyout<T extends RuleLike>({
  rules,
  extraTabsFactory,
  ruleActionsFactory,
  subHeaderFactory,
  flyoutProps,
}: UseRulePreviewFlyoutParams<T>): UseRulePreviewFlyoutResult<T> {
  const [rule, setRuleForPreview] = useState<T | undefined>();
  const closeRulePreview = useCallback(() => setRuleForPreview(undefined), []);
  const subHeader = useMemo(
    () => (rule ? subHeaderFactory?.(rule) : null),
    [subHeaderFactory, rule]
  );
  const ruleActions = useMemo(
    () => rule && ruleActionsFactory(rule, closeRulePreview),
    [rule, ruleActionsFactory, closeRulePreview]
  );
  const extraTabs = useMemo(
    () => (rule && extraTabsFactory ? extraTabsFactory(rule) : []),
    [rule, extraTabsFactory]
  );

  return {
    rulePreviewFlyout: rule && (
      <RuleDetailsFlyout
        rule={rule}
        size="l"
        id={flyoutProps.id}
        dataTestSubj={flyoutProps.dataTestSubj}
        closeFlyout={closeRulePreview}
        ruleActions={ruleActions}
        extraTabs={extraTabs}
        subHeader={subHeader}
      />
    ),
    openRulePreview: useCallback(
      (ruleId: RuleSignatureId) => {
        const ruleToShowInFlyout = rules.find((x) => x.rule_id === ruleId);

        invariant(ruleToShowInFlyout, `Rule with rule_id ${ruleId} not found`);
        setRuleForPreview(ruleToShowInFlyout);
      },
      [rules, setRuleForPreview]
    ),
    closeRulePreview,
  };
}
