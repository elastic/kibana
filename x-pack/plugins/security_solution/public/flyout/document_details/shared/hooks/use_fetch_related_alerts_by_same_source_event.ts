/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { ANCESTOR_ID } from '../constants/field_names';
import { useAlertPrevalence } from './use_alert_prevalence';
import { isActiveTimeline } from '../../../../helpers';

export interface UseFetchRelatedAlertsBySameSourceEventParams {
  /**
   * Value of the kibana.alert.original_event.id field
   */
  originalEventId: string;
  /**
   * Maintain backwards compatibility // TODO remove when possible
   */
  scopeId: string;
}
export interface UseFetchRelatedAlertsBySameSourceEventResult {
  /**
   * Returns true while data is loading
   */
  loading: boolean;
  /**
   * Returns true if there is an error while retrieving data
   */
  error: boolean;
  /**
   * Related alerts for the source event retrieved
   */
  data: string[];
  /**
   * Number of alerts the source event received
   */
  dataCount: number;
}

/**
 * Returns the number of alerts for the same source event (and the loading, error statuses as well as the alerts count)
 */
export const useFetchRelatedAlertsBySameSourceEvent = ({
  originalEventId,
  scopeId,
}: UseFetchRelatedAlertsBySameSourceEventParams): UseFetchRelatedAlertsBySameSourceEventResult => {
  const { loading, error, count, alertIds } = useAlertPrevalence({
    field: ANCESTOR_ID,
    value: originalEventId,
    isActiveTimelines: isActiveTimeline(scopeId),
    indexName: null,
    includeAlertIds: true,
  });

  return useMemo(
    () => ({
      loading,
      error,
      data: alertIds || [],
      dataCount: count || 0,
    }),
    [alertIds, count, error, loading]
  );
};
