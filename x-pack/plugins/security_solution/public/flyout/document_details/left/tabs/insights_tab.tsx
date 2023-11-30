/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';

import { EuiButtonGroup, EuiSpacer } from '@elastic/eui';
import type { EuiButtonGroupOptionProps } from '@elastic/eui/src/components/button/button_group/button_group';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import {
  INSIGHTS_TAB_BUTTON_GROUP_TEST_ID,
  INSIGHTS_TAB_ENTITIES_BUTTON_TEST_ID,
  INSIGHTS_TAB_THREAT_INTELLIGENCE_BUTTON_TEST_ID,
  INSIGHTS_TAB_PREVALENCE_BUTTON_TEST_ID,
  INSIGHTS_TAB_CORRELATIONS_BUTTON_TEST_ID,
} from './test_ids';
import { useLeftPanelContext } from '../context';
import { DocumentDetailsLeftPanelKey, LeftPanelInsightsTab } from '..';
import { ENTITIES_TAB_ID, EntitiesDetails } from '../components/entities_details';
import {
  THREAT_INTELLIGENCE_TAB_ID,
  ThreatIntelligenceDetails,
} from '../components/threat_intelligence_details';
import { PREVALENCE_TAB_ID, PrevalenceDetails } from '../components/prevalence_details';
import { CORRELATIONS_TAB_ID, CorrelationsDetails } from '../components/correlations_details';

const insightsButtons: EuiButtonGroupOptionProps[] = [
  {
    id: ENTITIES_TAB_ID,
    label: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.left.insights.entitiesButtonLabel"
        defaultMessage="Entities"
      />
    ),
    'data-test-subj': INSIGHTS_TAB_ENTITIES_BUTTON_TEST_ID,
  },
  {
    id: THREAT_INTELLIGENCE_TAB_ID,
    label: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.left.insights.threatIntelligenceButtonLabel"
        defaultMessage="Threat intelligence"
      />
    ),
    'data-test-subj': INSIGHTS_TAB_THREAT_INTELLIGENCE_BUTTON_TEST_ID,
  },
  {
    id: PREVALENCE_TAB_ID,
    label: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.left.insights.prevalenceButtonLabel"
        defaultMessage="Prevalence"
      />
    ),
    'data-test-subj': INSIGHTS_TAB_PREVALENCE_BUTTON_TEST_ID,
  },
  {
    id: CORRELATIONS_TAB_ID,
    label: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.left.insights.correlationsButtonLabel"
        defaultMessage="Correlations"
      />
    ),
    'data-test-subj': INSIGHTS_TAB_CORRELATIONS_BUTTON_TEST_ID,
  },
];

/**
 * Insights view displayed in the document details expandable flyout left section
 */
export const InsightsTab: React.FC = memo(() => {
  const { eventId, indexName, scopeId } = useLeftPanelContext();
  const { openLeftPanel, panels } = useExpandableFlyoutContext();
  const activeInsightsId = panels.left?.path?.subTab ?? ENTITIES_TAB_ID;

  const onChangeCompressed = useCallback(
    (optionId: string) => {
      openLeftPanel({
        id: DocumentDetailsLeftPanelKey,
        path: {
          tab: LeftPanelInsightsTab,
          subTab: optionId,
        },
        params: {
          id: eventId,
          indexName,
          scopeId,
        },
      });
    },
    [eventId, indexName, scopeId, openLeftPanel]
  );

  return (
    <>
      <EuiButtonGroup
        color="primary"
        name="coarsness"
        legend={i18n.translate(
          'xpack.securitySolution.flyout.left.insights.buttonGroupLegendLabel',
          {
            defaultMessage: 'Insights options',
          }
        )}
        options={insightsButtons}
        idSelected={activeInsightsId}
        onChange={onChangeCompressed}
        buttonSize="compressed"
        isFullWidth
        data-test-subj={INSIGHTS_TAB_BUTTON_GROUP_TEST_ID}
      />
      <EuiSpacer size="m" />
      {activeInsightsId === ENTITIES_TAB_ID && <EntitiesDetails />}
      {activeInsightsId === THREAT_INTELLIGENCE_TAB_ID && <ThreatIntelligenceDetails />}
      {activeInsightsId === PREVALENCE_TAB_ID && <PrevalenceDetails />}
      {activeInsightsId === CORRELATIONS_TAB_ID && <CorrelationsDetails />}
    </>
  );
});

InsightsTab.displayName = 'InsightsTab';
