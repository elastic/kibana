/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { EuiButton } from '@elastic/eui';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { useRightPanelContext } from '../context';
import { useRuleWithFallback } from '../../../detection_engine/rule_management/logic/use_rule_with_fallback';
import { useBasicDataFromDetailsData } from '../../../timelines/components/side_panel/event_details/helpers';
import { LeftPanelKey, LeftPanelInvestigationTab } from '../../left';
import { INVESTIGATION_GUIDE_BUTTON_TEST_ID } from './test_ids';
import { INVESTIGATION_GUIDE_TITLE } from './translations';

/**
 * Investigation guide button that opens Investigation section in the left panel
 */
export const InvestigationGuideButton: React.FC = () => {
  const { openLeftPanel } = useExpandableFlyoutContext();
  const { eventId, indexName, scopeId, dataFormattedForFieldBrowser } = useRightPanelContext();

  const { ruleId } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);
  const { rule: maybeRule } = useRuleWithFallback(ruleId);

  const goToInvestigationsTab = useCallback(() => {
    openLeftPanel({
      id: LeftPanelKey,
      path: {
        tab: LeftPanelInvestigationTab,
      },
      params: {
        id: eventId,
        indexName,
        scopeId,
      },
    });
  }, [eventId, indexName, openLeftPanel, scopeId]);

  if (!dataFormattedForFieldBrowser || !ruleId || !maybeRule?.note) {
    return null;
  }
  return (
    <EuiButton
      onClick={goToInvestigationsTab}
      iconType="documentation"
      data-test-subj={INVESTIGATION_GUIDE_BUTTON_TEST_ID}
    >
      {INVESTIGATION_GUIDE_TITLE}
    </EuiButton>
  );
};

InvestigationGuideButton.displayName = 'InvestigationGuideButton';
