/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { i18n } from '@kbn/i18n';
import { PanelContent } from './content';
import { PanelHeader } from './header';
import { PreviewFooter } from '../preview/footer';
import { useRuleDetails } from '../hooks/use_rule_details';
import { LOADING_TEST_ID } from './test_ids';
import { FlyoutLoading } from '../../shared/components/flyout_loading';
import { FlyoutNavigation } from '../../shared/components/flyout_navigation';
import { FlyoutError } from '../../shared/components/flyout_error';

export interface RulePanelExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'rule-panel' | 'rule-preview-panel';
  params: {
    ruleId: string;
    isPreviewMode?: boolean;
  };
}

export const RulePanelKey: RulePanelExpandableFlyoutProps['key'] = 'rule-panel';
export const RulePreviewPanelKey: RulePanelExpandableFlyoutProps['key'] = 'rule-preview-panel';

export const RULE_PREVIEW_BANNER = {
  title: i18n.translate('xpack.securitySolution.flyout.right.rule.rulePreviewTitle', {
    defaultMessage: 'Preview rule details',
  }),
  backgroundColor: 'warning',
  textColor: 'warning',
};

export interface RulePanelProps extends Record<string, unknown> {
  /**
   * Rule ID
   */
  ruleId: string;
  /**
   * If in preview mode, show preview banner and footer
   */
  isPreviewMode?: boolean;
}

/**
 * Displays a rule overview panel
 */
export const RulePanel = memo(({ ruleId, isPreviewMode }: RulePanelProps) => {
  const { rule, loading, isExistingRule } = useRuleDetails({ ruleId });

  return loading ? (
    <FlyoutLoading data-test-subj={LOADING_TEST_ID} />
  ) : rule ? (
    <>
      <FlyoutNavigation flyoutIsExpandable={false} />
      <PanelHeader rule={rule} isSuppressed={!isExistingRule} />
      <PanelContent rule={rule} />
      {isPreviewMode && <PreviewFooter ruleId={ruleId} />}
    </>
  ) : (
    <FlyoutError />
  );
});

RulePanel.displayName = 'RulePanel';
