/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { groupBy } from 'lodash';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { CtiEnrichment } from '../../../../../common/search_strategy';
import { useBasicDataFromDetailsData } from '../../shared/hooks/use_basic_data_from_details_data';
import {
  filterDuplicateEnrichments,
  getEnrichmentFields,
  parseExistingEnrichments,
  timelineDataToEnrichment,
} from '../../shared/utils/threat_intelligence';
import { useInvestigationTimeEnrichment } from '../../shared/hooks/use_investigation_enrichment';
import { ENRICHMENT_TYPES } from '../../../../../common/cti/constants';

export interface UseThreatIntelligenceParams {
  /**
   * An array of field objects with category and value
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[];
}

export interface UseThreatIntelligenceResult {
  /**
   * Returns true while the threat intelligence data is being queried
   */
  loading: boolean;
  /**
   * Threat matches (from an indicator match rule)
   */
  threatMatches: CtiEnrichment[];
  /**
   * Threat matches count
   */
  threatMatchesCount: number;
  /**
   * Threat enrichments (from the real time query)
   */
  threatEnrichments: CtiEnrichment[];
  /**
   *  Threat enrichments count
   */
  threatEnrichmentsCount: number;
}

/**
 * Hook to retrieve threat intelligence data for the expandable flyout right and left sections.
 */
export const useFetchThreatIntelligence = ({
  dataFormattedForFieldBrowser,
}: UseThreatIntelligenceParams): UseThreatIntelligenceResult => {
  const { isAlert } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);

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
  const { result: response, loading } = useInvestigationTimeEnrichment({ eventFields });

  // combine existing enrichment and enrichment from the api response
  // also removes the investigation-time enrichments if the exact indicator already exists
  const allEnrichments = useMemo(() => {
    if (loading || !response?.enrichments) {
      return existingEnrichments;
    }
    return filterDuplicateEnrichments([...existingEnrichments, ...response.enrichments]);
  }, [loading, response, existingEnrichments]);

  // separate threat matches (from indicator-match rule) from threat enrichments (realtime query)
  const {
    [ENRICHMENT_TYPES.IndicatorMatchRule]: threatMatches,
    [ENRICHMENT_TYPES.InvestigationTime]: threatEnrichments,
  } = groupBy(allEnrichments, 'matched.type');

  return {
    loading,
    threatMatches,
    threatMatchesCount: (threatMatches || []).length,
    threatEnrichments,
    threatEnrichmentsCount: (threatEnrichments || []).length,
  };
};
