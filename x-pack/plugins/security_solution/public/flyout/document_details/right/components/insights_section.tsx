/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { CorrelationsOverview } from './correlations_overview';
import { PrevalenceOverview } from './prevalence_overview';
import { ThreatIntelligenceOverview } from './threat_intelligence_overview';
import { INSIGHTS_TEST_ID } from './test_ids';
import { EntitiesOverview } from './entities_overview';
import { ExpandableSection } from './expandable_section';

export interface InsightsSectionProps {
  /**
   * Boolean to allow the component to be expanded or collapsed on first render
   */
  expanded?: boolean;
}

/**
 * Insights section under overview tab. It contains entities, threat intelligence, prevalence and correlations.
 */
export const InsightsSection: React.FC<InsightsSectionProps> = ({ expanded = false }) => {
  return (
    <ExpandableSection
      title={
        <FormattedMessage
          id="xpack.securitySolution.flyout.right.insights.sectionTitle"
          defaultMessage="Insights"
        />
      }
      expanded={expanded}
      data-test-subj={INSIGHTS_TEST_ID}
    >
      <EntitiesOverview />
      <EuiSpacer size="s" />
      <ThreatIntelligenceOverview />
      <EuiSpacer size="s" />
      <CorrelationsOverview />
      <EuiSpacer size="s" />
      <PrevalenceOverview />
    </ExpandableSection>
  );
};

InsightsSection.displayName = 'InsightsSection';
