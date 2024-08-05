/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import isEmpty from 'lodash/isEmpty';
import { groupBy } from 'lodash';
import { FlyoutLoading } from '@kbn/security-solution-common';
import { EnrichmentSection } from './threat_details_view_enrichment_section';
import { ENRICHMENT_TYPES } from '../../../../../common/cti/constants';
import { EnrichmentRangePicker } from './threat_intelligence_view_enrichment_range_picker';
import { useThreatIntelligenceDetails } from '../hooks/use_threat_intelligence_details';
import {
  THREAT_INTELLIGENCE_DETAILS_ENRICHMENTS_TEST_ID,
  THREAT_INTELLIGENCE_DETAILS_LOADING_TEST_ID,
  THREAT_INTELLIGENCE_ENRICHMENTS_TEST_ID,
  THREAT_INTELLIGENCE_MATCHES_TEST_ID,
} from './test_ids';

export const THREAT_INTELLIGENCE_TAB_ID = 'threatIntelligence';

/**
 * Threat intelligence displayed in the document details expandable flyout left section under the Insights tab
 */
export const ThreatIntelligenceDetails = memo(() => {
  const {
    enrichments,
    eventFields,
    isEnrichmentsLoading,
    isEventDataLoading,
    isLoading,
    range,
    setRange,
  } = useThreatIntelligenceDetails();

  const showInvestigationTimeEnrichments = !isEmpty(eventFields);
  const {
    [ENRICHMENT_TYPES.IndicatorMatchRule]: indicatorMatches,
    [ENRICHMENT_TYPES.InvestigationTime]: threatIntelEnrichments,
    undefined: matchesWithNoType,
  } = groupBy(enrichments, 'matched.type');

  return isEventDataLoading ? (
    <FlyoutLoading data-test-subj={THREAT_INTELLIGENCE_DETAILS_LOADING_TEST_ID} />
  ) : (
    <>
      <EnrichmentSection
        dataTestSubj={THREAT_INTELLIGENCE_DETAILS_ENRICHMENTS_TEST_ID}
        enrichments={indicatorMatches}
        type={ENRICHMENT_TYPES.IndicatorMatchRule}
      />

      {showInvestigationTimeEnrichments ? (
        <>
          <EuiHorizontalRule />
          <EnrichmentSection
            dataTestSubj={THREAT_INTELLIGENCE_ENRICHMENTS_TEST_ID}
            enrichments={threatIntelEnrichments}
            type={ENRICHMENT_TYPES.InvestigationTime}
            loading={isLoading}
          >
            <EnrichmentRangePicker
              setRange={setRange}
              loading={isEnrichmentsLoading}
              range={range}
            />
            <EuiSpacer size="m" />
          </EnrichmentSection>
        </>
      ) : null}

      {matchesWithNoType ? (
        <>
          <EuiHorizontalRule />
          {indicatorMatches && <EuiSpacer size="l" />}
          <EnrichmentSection
            enrichments={matchesWithNoType}
            dataTestSubj={THREAT_INTELLIGENCE_MATCHES_TEST_ID}
          />
        </>
      ) : null}
    </>
  );
});

ThreatIntelligenceDetails.displayName = 'ThreatIntelligenceDetails';
