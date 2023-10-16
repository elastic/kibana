/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import isEmpty from 'lodash/isEmpty';
import { EnrichmentRangePicker } from '../../../../common/components/event_details/cti_details/enrichment_range_picker';
import { ThreatDetailsView } from '../../../../common/components/event_details/cti_details/threat_details_view';
import { useThreatIntelligenceDetails } from '../hooks/use_threat_intelligence_details';
import { THREAT_INTELLIGENCE_DETAILS_LOADING_TEST_ID } from './test_ids';
import { FlyoutLoading } from '../../../shared/components/flyout_loading';

export const THREAT_INTELLIGENCE_TAB_ID = 'threat-intelligence-details';

/**
 * Threat intelligence displayed in the document details expandable flyout left section under the Insights tab
 */
export const ThreatIntelligenceDetails: React.FC = () => {
  const {
    enrichments,
    eventFields,
    isEnrichmentsLoading,
    isEventDataLoading,
    isLoading,
    range,
    setRange,
  } = useThreatIntelligenceDetails();

  return isEventDataLoading ? (
    <FlyoutLoading data-test-subj={THREAT_INTELLIGENCE_DETAILS_LOADING_TEST_ID} />
  ) : (
    <ThreatDetailsView
      before={null}
      loading={isLoading}
      enrichments={enrichments}
      showInvestigationTimeEnrichments={!isEmpty(eventFields)}
    >
      <>
        <EnrichmentRangePicker setRange={setRange} loading={isEnrichmentsLoading} range={range} />
        <EuiSpacer size="m" />
      </>
    </ThreatDetailsView>
  );
};

ThreatIntelligenceDetails.displayName = 'ThreatIntelligenceDetails';
