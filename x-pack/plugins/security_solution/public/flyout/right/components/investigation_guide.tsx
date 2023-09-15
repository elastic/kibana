/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiTitle } from '@elastic/eui';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { FormattedMessage } from '@kbn/i18n-react';
import { useInvestigationGuide } from '../../shared/hooks/use_investigation_guide';
import { useRightPanelContext } from '../context';
import { LeftPanelKey, LeftPanelInvestigationTab } from '../../left';
import {
  INVESTIGATION_GUIDE_BUTTON_TEST_ID,
  INVESTIGATION_GUIDE_LOADING_TEST_ID,
  INVESTIGATION_GUIDE_NO_DATA_TEST_ID,
  INVESTIGATION_GUIDE_TEST_ID,
} from './test_ids';

/**
 * Render either the investigation guide button that opens Investigation section in the left panel,
 * or a no-data message if investigation guide hasn't been set up on the rule
 */
export const InvestigationGuide: React.FC = () => {
  const { openLeftPanel } = useExpandableFlyoutContext();
  const { eventId, indexName, scopeId, dataFormattedForFieldBrowser } = useRightPanelContext();

  const { loading, error, basicAlertData, ruleNote } = useInvestigationGuide({
    dataFormattedForFieldBrowser,
  });

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

  if (loading) {
    return (
      <EuiFlexGroup
        justifyContent="spaceAround"
        data-test-subj={INVESTIGATION_GUIDE_LOADING_TEST_ID}
      >
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem data-test-subj={INVESTIGATION_GUIDE_TEST_ID}>
        <EuiTitle size="xxs">
          <h5>
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.investigation.investigationGuide.investigationGuideTitle"
              defaultMessage="Investigation guide"
            />
          </h5>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem>
        {!error && basicAlertData.ruleId && ruleNote ? (
          <EuiButton
            onClick={goToInvestigationsTab}
            iconType="documentation"
            data-test-subj={INVESTIGATION_GUIDE_BUTTON_TEST_ID}
          >
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.investigation.investigationGuide.investigationGuideButtonLabel"
              defaultMessage="Show investigation guide"
            />
          </EuiButton>
        ) : (
          <p data-test-subj={INVESTIGATION_GUIDE_NO_DATA_TEST_ID}>
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.investigation.investigationGuide.noDataDescription"
              defaultMessage="There’s no investigation guide for this rule."
            />
          </p>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

InvestigationGuide.displayName = 'InvestigationGuideButton';
