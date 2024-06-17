/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { RunTimeMappings } from '../../../../../common/api/search_strategy';
import type { CtiEnrichment, EventFields } from '../../../../../common/search_strategy';
import { useBasicDataFromDetailsData } from '../../../../timelines/components/side_panel/event_details/helpers';
import {
  filterDuplicateEnrichments,
  getEnrichmentFields,
  parseExistingEnrichments,
  timelineDataToEnrichment,
} from '../../../../common/components/event_details/cti_details/helpers';
import { SecurityPageName } from '../../../../../common/constants';
import { SourcererScopeName } from '../../../../sourcerer/store/model';

import { useInvestigationTimeEnrichment } from '../../../../common/containers/cti/event_enrichment';
import { useTimelineEventsDetails } from '../../../../timelines/containers/details';
import { useSourcererDataView } from '../../../../sourcerer/containers';
import { useRouteSpy } from '../../../../common/utils/route/use_route_spy';
import { useLeftPanelContext } from '../context';

export interface ThreatIntelligenceDetailsValue {
  enrichments: CtiEnrichment[];
  eventFields: EventFields;
  isEnrichmentsLoading: boolean;
  isEventDataLoading: boolean;
  isLoading: boolean;
  range: {
    from: string;
    to: string;
  };
  setRange: (range: { from: string; to: string }) => void;
}

/**
 * A hook that returns data necessary strictly to render Threat Intel Insights.
 * Reusing a bunch of hooks scattered across kibana, it makes it easier to mock the data layer
 * for component testing.
 */
export const useThreatIntelligenceDetails = (): ThreatIntelligenceDetailsValue => {
  const { indexName, eventId } = useLeftPanelContext();
  const [{ pageName }] = useRouteSpy();
  const sourcererScope =
    pageName === SecurityPageName.detections
      ? SourcererScopeName.detections
      : SourcererScopeName.default;
  const sourcererDataView = useSourcererDataView(sourcererScope);

  const [isEventDataLoading, eventData] = useTimelineEventsDetails({
    indexName,
    eventId,
    runtimeMappings: sourcererDataView.runtimeMappings as RunTimeMappings,
    skip: !eventId,
  });

  const { isAlert } = useBasicDataFromDetailsData(eventData);

  const data = useMemo(() => eventData || [], [eventData]);
  const eventFields = useMemo(() => getEnrichmentFields(data || []), [data]);

  const {
    result: enrichmentsResponse,
    loading: isEnrichmentsLoading,
    setRange,
    range,
  } = useInvestigationTimeEnrichment(eventFields);

  const existingEnrichments = useMemo(
    () =>
      isAlert
        ? parseExistingEnrichments(data).map((enrichmentData) =>
            timelineDataToEnrichment(enrichmentData)
          )
        : [],
    [data, isAlert]
  );

  const allEnrichments = useMemo(() => {
    if (isEnrichmentsLoading || !enrichmentsResponse?.enrichments) {
      return existingEnrichments;
    }
    return filterDuplicateEnrichments([...existingEnrichments, ...enrichmentsResponse.enrichments]);
  }, [isEnrichmentsLoading, enrichmentsResponse, existingEnrichments]);

  const isLoading = isEnrichmentsLoading || isEventDataLoading;

  return {
    enrichments: allEnrichments,
    eventFields,
    isEnrichmentsLoading,
    isEventDataLoading,
    isLoading,
    range,
    setRange,
  };
};
