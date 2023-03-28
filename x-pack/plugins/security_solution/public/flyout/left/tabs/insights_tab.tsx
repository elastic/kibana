/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';

import { EuiButtonGroup, EuiSpacer } from '@elastic/eui';
import type { EuiButtonGroupOptionProps } from '@elastic/eui/src/components/button/button_group/button_group';
import {
  INSIGHTS_TAB_BUTTON_GROUP_TEST_ID,
  INSIGHTS_TAB_ENTITIES_BUTTON_TEST_ID,
  INSIGHTS_TAB_THREAT_INTELLIGENCE_BUTTON_TEST_ID,
  INSIGHTS_TAB_PREVALENCE_BUTTON_TEST_ID,
  INSIGHTS_TAB_CORRELATIONS_BUTTON_TEST_ID,
} from './test_ids';

import {
  INSIGHTS_BUTTONGROUP_OPTIONS,
  ENTITIES_BUTTON,
  THREAT_INTELLIGENCE_BUTTON,
  PREVALENCE_BUTTON,
  CORRELATIONS_BUTTON,
} from './translations';
import { ENTITIES_DETAILS_ID, EntitiesDetails } from '../components/entities_details';
import {
  THREAT_INTELLIGENCE_DETAILS_ID,
  ThreatIntelligenceDetails,
} from '../components/threat_intelligence_details';
import { PREVALENCE_DETAILS_ID, PrevalenceDetails } from '../components/prevalence_details';
import { CORRELATIONS_DETAILS_ID, CorrelationsDetails } from '../components/correlations_details';

const insightsButtons: EuiButtonGroupOptionProps[] = [
  {
    id: ENTITIES_DETAILS_ID,
    label: ENTITIES_BUTTON,
    'data-test-subj': INSIGHTS_TAB_ENTITIES_BUTTON_TEST_ID,
  },
  {
    id: THREAT_INTELLIGENCE_DETAILS_ID,
    label: THREAT_INTELLIGENCE_BUTTON,
    'data-test-subj': INSIGHTS_TAB_THREAT_INTELLIGENCE_BUTTON_TEST_ID,
  },
  {
    id: PREVALENCE_DETAILS_ID,
    label: PREVALENCE_BUTTON,
    'data-test-subj': INSIGHTS_TAB_PREVALENCE_BUTTON_TEST_ID,
  },
  {
    id: CORRELATIONS_DETAILS_ID,
    label: CORRELATIONS_BUTTON,
    'data-test-subj': INSIGHTS_TAB_CORRELATIONS_BUTTON_TEST_ID,
  },
];

/**
 * Insights view displayed in the document details expandable flyout left section
 */
export const InsightsTab: React.FC = memo(() => {
  const [activeInsightsId, setActiveInsightsId] = useState(ENTITIES_DETAILS_ID);
  const onChangeCompressed = (optionId: string) => {
    setActiveInsightsId(optionId);
  };

  return (
    <>
      <EuiButtonGroup
        color="primary"
        name="coarsness"
        legend={INSIGHTS_BUTTONGROUP_OPTIONS}
        options={insightsButtons}
        idSelected={activeInsightsId}
        onChange={(id) => onChangeCompressed(id)}
        buttonSize="compressed"
        isFullWidth
        data-test-subj={INSIGHTS_TAB_BUTTON_GROUP_TEST_ID}
      />
      <EuiSpacer size="m" />
      {activeInsightsId === ENTITIES_DETAILS_ID && <EntitiesDetails />}
      {activeInsightsId === THREAT_INTELLIGENCE_DETAILS_ID && <ThreatIntelligenceDetails />}
      {activeInsightsId === PREVALENCE_DETAILS_ID && <PrevalenceDetails />}
      {activeInsightsId === CORRELATIONS_DETAILS_ID && <CorrelationsDetails />}
    </>
  );
});

InsightsTab.displayName = 'InsightsTab';
