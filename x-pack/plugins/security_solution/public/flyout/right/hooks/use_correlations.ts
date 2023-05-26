/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { useFetchRelatedAlertsBySameSourceEvent } from './use_fetch_related_alerts_by_same_source_event';
import { useShowRelatedCases } from './use_show_related_cases';
import { useFetchRelatedCases } from './use_fetch_related_cases';
import {
  CORRELATIONS_ANCESTRY_ALERT,
  CORRELATIONS_ANCESTRY_ALERTS,
  CORRELATIONS_RELATED_CASE,
  CORRELATIONS_RELATED_CASES,
  CORRELATIONS_SAME_SESSION_ALERT,
  CORRELATIONS_SAME_SESSION_ALERTS,
  CORRELATIONS_SAME_SOURCE_EVENT_ALERT,
  CORRELATIONS_SAME_SOURCE_EVENT_ALERTS,
} from '../components/translations';
import { useShowRelatedAlertsByAncestry } from './use_show_related_alerts_by_ancestry';
import { useFetchRelatedAlertsByAncestry } from './use_fetch_related_alerts_by_ancestry';
import { useShowRelatedAlertsBySameSourceEvent } from './use_show_related_alerts_by_same_source_event';
import { useShowRelatedAlertsBySession } from './use_show_related_alerts_by_session';
import { useFetchRelatedAlertsBySession } from './use_fetch_related_alerts_by_session';

interface InsightsSummaryData {
  icon: string;
  value: number;
  text: string;
}

export interface UseCorrelationsParams {
  /**
   * Id of the document
   */
  eventId: string;
  /**
   * An object with top level fields from the ECS object
   */
  dataAsNestedObject: Ecs | null;
  /**
   * An array of field objects with category and value
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[] | null;
  /**
   * Maintain backwards compatibility // TODO remove when possible
   */
  scopeId: string;
}
export interface UseCorrelationsResult {
  /**
   * Returns true while data is loading
   */
  loading: boolean;
  /**
   * Returns true if there is an error while retrieving data
   */
  error: boolean;
  /**
   * Data ready to be consumed by the InsightsSummaryPanel component
   */
  data: InsightsSummaryData[];
  /**
   * Data length
   */
  dataCount: number;
}

/**
 * Retrieves all correlations data from custom hooks
 */
// eslint-disable-next-line complexity
export const useCorrelations = ({
  eventId,
  dataAsNestedObject,
  dataFormattedForFieldBrowser,
  scopeId,
}: UseCorrelationsParams): UseCorrelationsResult => {
  const data: InsightsSummaryData[] = [];

  // cases
  const showCases = useShowRelatedCases();
  const {
    loading: casesLoading,
    error: casesError,
    dataCount: casesCount,
  } = useFetchRelatedCases({ eventId });
  if (showCases && !casesLoading && !casesError) {
    data.push({
      icon: 'warning',
      value: casesCount,
      text: casesCount <= 1 ? CORRELATIONS_RELATED_CASE : CORRELATIONS_RELATED_CASES,
    });
  }

  // alerts by ancestry
  const showAlertsByAncestry = useShowRelatedAlertsByAncestry({
    dataFormattedForFieldBrowser,
    dataAsNestedObject,
  });
  const {
    loading: ancestryAlertsLoading,
    error: ancestryAlertsError,
    dataCount: ancestryAlertsCount,
  } = useFetchRelatedAlertsByAncestry({
    dataFormattedForFieldBrowser,
    scopeId,
  });
  if (showAlertsByAncestry && !ancestryAlertsLoading && !ancestryAlertsError) {
    data.push({
      icon: 'warning',
      value: ancestryAlertsCount,
      text: ancestryAlertsCount <= 1 ? CORRELATIONS_ANCESTRY_ALERT : CORRELATIONS_ANCESTRY_ALERTS,
    });
  }

  // alerts related to same source event
  const showSameSourceAlerts = useShowRelatedAlertsBySameSourceEvent({
    dataFormattedForFieldBrowser,
  });
  const {
    loading: sameSourceAlertsLoading,
    error: sameSourceAlertsError,
    dataCount: sameSourceAlertsCount,
  } = useFetchRelatedAlertsBySameSourceEvent({
    dataFormattedForFieldBrowser,
    scopeId,
  });
  if (showSameSourceAlerts && !sameSourceAlertsLoading && !sameSourceAlertsError) {
    data.push({
      icon: 'warning',
      value: sameSourceAlertsCount,
      text:
        sameSourceAlertsCount <= 1
          ? CORRELATIONS_SAME_SOURCE_EVENT_ALERT
          : CORRELATIONS_SAME_SOURCE_EVENT_ALERTS,
    });
  }

  // alerts related by session
  const showAlertsBySession = useShowRelatedAlertsBySession({ dataFormattedForFieldBrowser });
  const {
    loading: alertsBySessionLoading,
    error: alertsBySessionError,
    dataCount: alertsBySessionCount,
  } = useFetchRelatedAlertsBySession({
    dataFormattedForFieldBrowser,
    scopeId,
  });
  if (showAlertsBySession && !alertsBySessionLoading && !alertsBySessionError) {
    data.push({
      icon: 'warning',
      value: alertsBySessionCount,
      text:
        alertsBySessionCount <= 1
          ? CORRELATIONS_SAME_SESSION_ALERT
          : CORRELATIONS_SAME_SESSION_ALERTS,
    });
  }

  return {
    loading:
      casesLoading || ancestryAlertsLoading || alertsBySessionLoading || sameSourceAlertsLoading,
    error: data.length === 0,
    data: data || [],
    dataCount: data.length || 0,
  };
};
