/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { EuiButtonGroup, EuiSpacer } from '@elastic/eui';
import type { EuiButtonGroupOptionProps } from '@elastic/eui/src/components/button/button_group/button_group';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useExpandableFlyoutApi, useExpandableFlyoutState } from '@kbn/expandable-flyout';
import { useKibana } from '../../../../common/lib/kibana';
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
import { getField } from '../../shared/utils';
import { EventKind } from '../../shared/constants/event_kinds';

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
  const { telemetry } = useKibana().services;
  const { eventId, indexName, scopeId, getFieldsData } = useLeftPanelContext();
  const isEventKindSignal = getField(getFieldsData('event.kind')) === EventKind.signal;
  const { openLeftPanel } = useExpandableFlyoutApi();
  const panels = useExpandableFlyoutState();
  const activeInsightsId = panels.left?.path?.subTab ?? ENTITIES_TAB_ID;

  // insight tabs based on whether document is alert or non-alert
  // alert: entities, threat intelligence, prevalence, correlations
  // non-alert: entities, prevalence
  const buttonGroup = useMemo(
    () =>
      isEventKindSignal
        ? insightsButtons
        : insightsButtons.filter(
            (tab) => tab.id === ENTITIES_TAB_ID || tab.id === PREVALENCE_TAB_ID
          ),
    [isEventKindSignal]
  );

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
      telemetry.reportDetailsFlyoutTabClicked({
        tableId: scopeId,
        panel: 'left',
        tabId: optionId,
      });
    },
    [eventId, indexName, scopeId, openLeftPanel, telemetry]
  );

  return (
    <>
      <EuiButtonGroup
        color="primary"
        legend={i18n.translate(
          'xpack.securitySolution.flyout.left.insights.buttonGroupLegendLabel',
          { defaultMessage: 'Insights options' }
        )}
        options={buttonGroup}
        idSelected={activeInsightsId}
        onChange={onChangeCompressed}
        buttonSize="compressed"
        isFullWidth
        data-test-subj={INSIGHTS_TAB_BUTTON_GROUP_TEST_ID}
        style={!isEventKindSignal ? { maxWidth: 300 } : undefined}
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
