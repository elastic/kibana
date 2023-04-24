/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import {
  filterDuplicateEnrichments,
  getEnrichmentFields,
  parseExistingEnrichments,
  timelineDataToEnrichment,
} from '../../../../common/components/event_details/cti_details/helpers';
import { SecurityPageName } from '../../../../../common/constants';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';

import { useInvestigationTimeEnrichment } from '../../../../common/containers/cti/event_enrichment';
import { useTimelineEventsDetails } from '../../../../timelines/containers/details';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { useRouteSpy } from '../../../../common/utils/route/use_route_spy';
import { useLeftPanelContext } from '../../context';

export const useThreatIntelligenceDetails = () => {
  const isAlert = true;

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
    runtimeMappings: sourcererDataView.runtimeMappings,
    skip: !eventId,
  });

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
