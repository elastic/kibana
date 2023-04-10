/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { useExpandableFlyoutContext } from '@kbn/expandable-flyout';
import { groupBy } from 'lodash';
import { InsightsSubSection } from './insights_subsection';
import { ENRICHMENT_TYPES } from '../../../../common/cti/constants';
import { useInvestigationTimeEnrichment } from '../../../common/containers/cti/event_enrichment';
import { useBasicDataFromDetailsData } from '../../../timelines/components/side_panel/event_details/helpers';
import {
  filterDuplicateEnrichments,
  getEnrichmentFields,
  parseExistingEnrichments,
  timelineDataToEnrichment,
} from '../../../common/components/event_details/cti_details/helpers';
import type { InsightsSummaryPanelData } from './insights_summary_panel';
import { InsightsSummaryPanel } from './insights_summary_panel';
import { useRightPanelContext } from '../context';
import { INSIGHTS_THREAT_INTELLIGENCE_TEST_ID } from './test_ids';
import {
  VIEW_ALL,
  THREAT_INTELLIGENCE_TITLE,
  THREAT_INTELLIGENCE_TEXT,
  THREAT_MATCH_DETECTED,
  THREAT_ENRICHMENT,
  THREAT_MATCHES_DETECTED,
  THREAT_ENRICHMENTS,
} from './translations';
import { LeftPanelKey, LeftPanelInsightsTabPath } from '../../left';

/**
 * Threat Intelligence section under Insights section, overview tab.
 * The component fetches the necessary data, then pass it down to the InsightsSubSection component for loading and error state,
 * and the SummaryPanel component for data rendering.
 */
export const ThreatIntelligenceOverview: React.FC = () => {
  const { eventId, indexName, dataFormattedForFieldBrowser } = useRightPanelContext();
  const { openLeftPanel } = useExpandableFlyoutContext();
  const { isAlert } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);

  const goToThreatIntelligenceTab = useCallback(() => {
    openLeftPanel({
      id: LeftPanelKey,
      path: LeftPanelInsightsTabPath,
      params: {
        id: eventId,
        indexName,
      },
    });
  }, [eventId, openLeftPanel, indexName]);

  // retrieve the threat enrichment fields with value for the current document
  // (see https://github.com/elastic/kibana/blob/main/x-pack/plugins/security_solution/common/cti/constants.ts#L35)
  const eventFields = useMemo(
    () => getEnrichmentFields(dataFormattedForFieldBrowser || []),
    [dataFormattedForFieldBrowser]
  );

  // retrieve existing enrichment fields and their value
  const existingEnrichments = useMemo(
    () =>
      isAlert
        ? parseExistingEnrichments(dataFormattedForFieldBrowser || []).map((enrichmentData) =>
            timelineDataToEnrichment(enrichmentData)
          )
        : [],
    [dataFormattedForFieldBrowser, isAlert]
  );

  // api call to retrieve all documents that match the eventFields
  const { result: enrichmentsResponse, loading: isEnrichmentsLoading } =
    useInvestigationTimeEnrichment(eventFields);

  // combine existing enrichment and enrichment from the api response
  // also removes the investigation-time enrichments if the exact indicator already exists
  const allEnrichments = useMemo(() => {
    if (isEnrichmentsLoading || !enrichmentsResponse?.enrichments) {
      return existingEnrichments;
    }
    return filterDuplicateEnrichments([...existingEnrichments, ...enrichmentsResponse.enrichments]);
  }, [isEnrichmentsLoading, enrichmentsResponse, existingEnrichments]);

  // separate threat matches (from indicator-match rule) from threat enrichments (realtime query)
  const {
    [ENRICHMENT_TYPES.IndicatorMatchRule]: threatMatches,
    [ENRICHMENT_TYPES.InvestigationTime]: threatEnrichments,
  } = groupBy(allEnrichments, 'matched.type');

  const threatMatchesCount = (threatMatches || []).length;
  const threatEnrichmentsCount = (threatEnrichments || []).length;

  const data: InsightsSummaryPanelData[] = [
    {
      icon: 'image',
      value: threatMatchesCount,
      text: threatMatchesCount <= 1 ? THREAT_MATCH_DETECTED : THREAT_MATCHES_DETECTED,
    },
    {
      icon: 'warning',
      value: threatEnrichmentsCount,
      text: threatMatchesCount <= 1 ? THREAT_ENRICHMENT : THREAT_ENRICHMENTS,
    },
  ];

  const error: boolean = !eventId || !dataFormattedForFieldBrowser || allEnrichments.length === 0;

  return (
    <InsightsSubSection
      loading={isEnrichmentsLoading}
      error={error}
      title={THREAT_INTELLIGENCE_TITLE}
      data-test-subj={INSIGHTS_THREAT_INTELLIGENCE_TEST_ID}
    >
      <InsightsSummaryPanel data={data} data-test-subj={INSIGHTS_THREAT_INTELLIGENCE_TEST_ID} />
      <EuiButtonEmpty
        onClick={goToThreatIntelligenceTab}
        iconType="arrowStart"
        iconSide="left"
        size="s"
        data-test-subj={`${INSIGHTS_THREAT_INTELLIGENCE_TEST_ID}ViewAllButton`}
      >
        {VIEW_ALL(THREAT_INTELLIGENCE_TEXT)}
      </EuiButtonEmpty>
    </InsightsSubSection>
  );
};

ThreatIntelligenceOverview.displayName = 'ThreatIntelligenceOverview';
