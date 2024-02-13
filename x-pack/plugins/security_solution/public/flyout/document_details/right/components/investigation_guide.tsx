/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiTitle, EuiSkeletonText } from '@elastic/eui';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useInvestigationGuide } from '../../shared/hooks/use_investigation_guide';
import { useRightPanelContext } from '../context';
import { DocumentDetailsLeftPanelKey, LeftPanelInvestigationTab } from '../../left';
import {
  INVESTIGATION_GUIDE_BUTTON_TEST_ID,
  INVESTIGATION_GUIDE_LOADING_TEST_ID,
  INVESTIGATION_GUIDE_TEST_ID,
} from './test_ids';

/**
 * Render either the investigation guide button that opens Investigation section in the left panel,
 * or a no-data message if investigation guide hasn't been set up on the rule
 */
export const InvestigationGuide: React.FC = () => {
  const { openLeftPanel } = useExpandableFlyoutApi();
  const { eventId, indexName, scopeId, dataFormattedForFieldBrowser, isPreview } =
    useRightPanelContext();

  const { loading, error, basicAlertData, ruleNote } = useInvestigationGuide({
    dataFormattedForFieldBrowser,
  });

  const goToInvestigationsTab = useCallback(() => {
    openLeftPanel({
      id: DocumentDetailsLeftPanelKey,
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

  return (
    <EuiFlexGroup direction="column" gutterSize="s" data-test-subj={INVESTIGATION_GUIDE_TEST_ID}>
      <EuiFlexItem>
        <EuiTitle size="xxs">
          <h5>
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.investigation.investigationGuide.investigationGuideTitle"
              defaultMessage="Investigation guide"
            />
          </h5>
        </EuiTitle>
      </EuiFlexItem>
      {isPreview ? (
        <FormattedMessage
          id="xpack.securitySolution.flyout.right.investigation.investigationGuide.previewMessage"
          defaultMessage="Investigation guide is not available in alert preview."
        />
      ) : loading ? (
        <EuiSkeletonText
          data-test-subj={INVESTIGATION_GUIDE_LOADING_TEST_ID}
          contentAriaLabel={i18n.translate(
            'xpack.securitySolution.flyout.right.investigation.investigationGuide.investigationGuideLoadingAriaLabel',
            { defaultMessage: 'investigation guide' }
          )}
        />
      ) : !error && basicAlertData.ruleId && ruleNote ? (
        <EuiFlexItem>
          <EuiButton
            onClick={goToInvestigationsTab}
            iconType="documentation"
            data-test-subj={INVESTIGATION_GUIDE_BUTTON_TEST_ID}
            aria-label={i18n.translate(
              'xpack.securitySolution.flyout.right.investigation.investigationGuide.investigationGuideButtonAriaLabel',
              {
                defaultMessage: 'Show investigation guide',
              }
            )}
          >
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.investigation.investigationGuide.investigationGuideButtonLabel"
              defaultMessage="Show investigation guide"
            />
          </EuiButton>
        </EuiFlexItem>
      ) : (
        <FormattedMessage
          id="xpack.securitySolution.flyout.right.investigation.investigationGuide.noDataDescription"
          defaultMessage="There’s no investigation guide for this rule."
        />
      )}
    </EuiFlexGroup>
  );
};

InvestigationGuide.displayName = 'InvestigationGuideButton';
