/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { find } from 'lodash/fp';
import { useMemo } from 'react';
import { useAlertPrevalence } from '../../../common/containers/alerts/use_alert_prevalence';
import { isActiveTimeline } from '../../../helpers';

export interface UseFetchRelatedAlertsBySessionParams {
  /**
   * An array of field objects with category and value
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[] | null;
  /**
   * Maintain backwards compatibility // TODO remove when possible
   */
  scopeId: string;
}
export interface UseFetchRelatedAlertsBySessionResult {
  /**
   * Returns true while data is loading
   */
  loading: boolean;
  /**
   * Returns true if there is an error while retrieving data
   */
  error: boolean;
  /**
   * Related alerts by session retrieved
   */
  data: string[];
  /**
   * Number of alerts by session received
   */
  dataCount: number;
}

/**
 * Returns the number of alerts by session for the document (and the loading, error statuses as well as the alerts count)
 */
export const useFetchRelatedAlertsBySession = ({
  dataFormattedForFieldBrowser,
  scopeId,
}: UseFetchRelatedAlertsBySessionParams): UseFetchRelatedAlertsBySessionResult => {
  const processSessionField = find(
    { category: 'process', field: 'process.entry_leader.entity_id' },
    dataFormattedForFieldBrowser
  );
  const { field, values } = processSessionField || { field: '', values: [] };
  const { loading, error, count, alertIds } = useAlertPrevalence({
    field,
    value: values,
    isActiveTimelines: isActiveTimeline(scopeId),
    signalIndexName: null,
    includeAlertIds: true,
    ignoreTimerange: true,
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
