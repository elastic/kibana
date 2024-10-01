/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useCallback, useState, useMemo } from 'react';
import type { EuiTabbedContentTab } from '@elastic/eui';
import { invariant } from '../../../../../common/utils/invariant';
import type { RuleObjectId } from '../../../../../common/api/detection_engine';
import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema';
import { RuleDetailsFlyout } from '../../../rule_management/components/rule_details/rule_details_flyout';

interface UseRulePreviewFlyoutParams {
  rules: RuleResponse[];
  ruleActionsFactory: (rule: RuleResponse, closeRulePreview: () => void) => ReactNode;
  extraTabsFactory?: (rule: RuleResponse) => EuiTabbedContentTab[];
  flyoutProps: RulePreviewFlyoutProps;
}

interface RulePreviewFlyoutProps {
  /**
   * Rule preview flyout unique id used in HTML
   */
  id: string;
  dataTestSubj: string;
}

interface UseRulePreviewFlyoutResult {
  rulePreviewFlyout: ReactNode;
  openRulePreview: (ruleId: RuleObjectId) => void;
  closeRulePreview: () => void;
}

export function useRulePreviewFlyout({
  rules,
  extraTabsFactory,
  ruleActionsFactory,
  flyoutProps,
}: UseRulePreviewFlyoutParams): UseRulePreviewFlyoutResult {
  const [rule, setRuleForPreview] = useState<RuleResponse | undefined>();
  const closeRulePreview = useCallback(() => setRuleForPreview(undefined), []);
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
      />
    ),
    openRulePreview: useCallback(
      (ruleId: RuleObjectId) => {
        const ruleToShowInFlyout = rules.find((x) => x.id === ruleId);

        invariant(ruleToShowInFlyout, `Rule with id ${ruleId} not found`);
        setRuleForPreview(ruleToShowInFlyout);
      },
      [rules, setRuleForPreview]
    ),
    closeRulePreview,
  };
}
