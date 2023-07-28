/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { useEffect, useMemo, useReducer } from 'react';
import type { GetRelatedCasesByAlertResponse } from '@kbn/cases-plugin/common';
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
} from '../translations';
import { useShowRelatedAlertsByAncestry } from './use_show_related_alerts_by_ancestry';
import { useFetchRelatedAlertsByAncestry } from './use_fetch_related_alerts_by_ancestry';
import { useShowRelatedAlertsBySameSourceEvent } from './use_show_related_alerts_by_same_source_event';
import { useShowRelatedAlertsBySession } from './use_show_related_alerts_by_session';
import { useFetchRelatedAlertsBySession } from './use_fetch_related_alerts_by_session';

export interface InsightsSummaryPanelData {
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
  data: InsightsSummaryPanelData[];
  /**
   * Data length
   */
  dataCount: number;
  /**
   * Ids of specific alerts correlated by session, can be used to fetch specific alert documents
   */
  alertsBySessionIds: string[];
  /**
   * Ids of specific alerts correlated by source, can be used to fetch specific alert documents
   */
  sameSourceAlertsIds: string[];
  /**
   * Ids of specific alerts correlated by ancestry, can be used to fetch specific alert documents
   */
  ancestryAlertsIds: string[];
  /**
   * Cases data, can be used to render correlated cases table
   */
  cases: GetRelatedCasesByAlertResponse;
}

/**
 * Retrieves all correlations data from custom hooks
 */
export const useCorrelations = ({
  eventId,
  dataAsNestedObject,
  dataFormattedForFieldBrowser,
  scopeId,
}: UseCorrelationsParams): UseCorrelationsResult => {
  const [data, updateInsightsSummaryPanel] = useReducer(
    (
      currentEntries: InsightsSummaryPanelData[],
      newEntry: { icon: string; value: number; text: string }
    ) => {
      return [...currentEntries, newEntry];
    },
    []
  );

  // cases
  const showCases = useShowRelatedCases();
  const {
    loading: casesLoading,
    error: casesError,
    dataCount: casesCount,
    data: cases,
  } = useFetchRelatedCases({ eventId });

  useEffect(() => {
    if (showCases && !casesLoading && !casesError) {
      updateInsightsSummaryPanel({
        icon: 'warning',
        value: casesCount,
        text: casesCount <= 1 ? CORRELATIONS_RELATED_CASE : CORRELATIONS_RELATED_CASES,
      });
    }
  }, [casesCount, casesError, casesLoading, showCases]);

  // alerts by ancestry
  const showAlertsByAncestry = useShowRelatedAlertsByAncestry({
    dataFormattedForFieldBrowser,
    dataAsNestedObject,
  });
  const {
    loading: ancestryAlertsLoading,
    error: ancestryAlertsError,
    dataCount: ancestryAlertsCount,
    data: ancestryAlertsIds,
  } = useFetchRelatedAlertsByAncestry({
    dataFormattedForFieldBrowser,
    scopeId,
  });

  useEffect(() => {
    if (showAlertsByAncestry && !ancestryAlertsLoading && !ancestryAlertsError) {
      updateInsightsSummaryPanel({
        icon: 'warning',
        value: ancestryAlertsCount,
        text: ancestryAlertsCount <= 1 ? CORRELATIONS_ANCESTRY_ALERT : CORRELATIONS_ANCESTRY_ALERTS,
      });
    }
  }, [ancestryAlertsCount, ancestryAlertsError, ancestryAlertsLoading, showAlertsByAncestry]);

  // alerts related to same source event
  const showSameSourceAlerts = useShowRelatedAlertsBySameSourceEvent({
    dataFormattedForFieldBrowser,
  });
  const {
    loading: sameSourceAlertsLoading,
    error: sameSourceAlertsError,
    dataCount: sameSourceAlertsCount,
    data: sameSourceAlertsIds,
  } = useFetchRelatedAlertsBySameSourceEvent({
    dataFormattedForFieldBrowser,
    scopeId,
  });

  useEffect(() => {
    if (showSameSourceAlerts && !sameSourceAlertsLoading && !sameSourceAlertsError) {
      updateInsightsSummaryPanel({
        icon: 'warning',
        value: sameSourceAlertsCount,
        text:
          sameSourceAlertsCount <= 1
            ? CORRELATIONS_SAME_SOURCE_EVENT_ALERT
            : CORRELATIONS_SAME_SOURCE_EVENT_ALERTS,
      });
    }
  }, [sameSourceAlertsCount, sameSourceAlertsError, sameSourceAlertsLoading, showSameSourceAlerts]);

  // alerts related by session
  const showAlertsBySession = useShowRelatedAlertsBySession({ dataFormattedForFieldBrowser });
  const {
    loading: alertsBySessionLoading,
    error: alertsBySessionError,
    dataCount: alertsBySessionCount,
    data: alertsBySessionIds,
  } = useFetchRelatedAlertsBySession({
    dataFormattedForFieldBrowser,
    scopeId,
  });

  useEffect(() => {
    if (showAlertsBySession && !alertsBySessionLoading && !alertsBySessionError) {
      updateInsightsSummaryPanel({
        icon: 'warning',
        value: alertsBySessionCount,
        text:
          alertsBySessionCount <= 1
            ? CORRELATIONS_SAME_SESSION_ALERT
            : CORRELATIONS_SAME_SESSION_ALERTS,
      });
    }
  }, [alertsBySessionCount, alertsBySessionError, alertsBySessionLoading, showAlertsBySession]);

  return useMemo(
    () => ({
      loading:
        casesLoading || ancestryAlertsLoading || alertsBySessionLoading || sameSourceAlertsLoading,
      error: data.length === 0,
      data,
      dataCount: data.length || 0,
      alertsBySessionIds,
      sameSourceAlertsIds,
      ancestryAlertsIds: ancestryAlertsIds || [],
      cases,
    }),
    [
      alertsBySessionIds,
      alertsBySessionLoading,
      ancestryAlertsIds,
      ancestryAlertsLoading,
      cases,
      casesLoading,
      data,
      sameSourceAlertsIds,
      sameSourceAlertsLoading,
    ]
  );
};
