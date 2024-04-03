/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useExpandSection } from '../hooks/use_expand_section';
import { CorrelationsOverview } from './correlations_overview';
import { PrevalenceOverview } from './prevalence_overview';
import { ThreatIntelligenceOverview } from './threat_intelligence_overview';
import { INSIGHTS_TEST_ID } from './test_ids';
import { EntitiesOverview } from './entities_overview';
import { ExpandableSection } from './expandable_section';
import { useRightPanelContext } from '../context';
import { getField } from '../../shared/utils';
import { EventKind } from '../../shared/constants/event_kinds';

const KEY = 'insights';

/**
 * Insights section under overview tab. It contains entities, threat intelligence, prevalence and correlations.
 */
export const InsightsSection: FC = memo(() => {
  const { getFieldsData } = useRightPanelContext();
  const eventKind = getField(getFieldsData('event.kind'));

  const expanded = useExpandSection({ title: KEY, defaultValue: false });

  return (
    <ExpandableSection
      expanded={expanded}
      title={
        <FormattedMessage
          id="xpack.securitySolution.flyout.right.insights.sectionTitle"
          defaultMessage="Insights"
        />
      }
      localStorageKey={KEY}
      data-test-subj={INSIGHTS_TEST_ID}
    >
      <EntitiesOverview />
      {eventKind === EventKind.signal && (
        <>
          <EuiSpacer size="s" />
          <ThreatIntelligenceOverview />
          <EuiSpacer size="s" />
          <CorrelationsOverview />
        </>
      )}
      <EuiSpacer size="s" />
      <PrevalenceOverview />
    </ExpandableSection>
  );
});

InsightsSection.displayName = 'InsightsSection';
