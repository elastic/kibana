/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { find } from 'lodash/fp';
import { useAlertPrevalence } from '../../../common/containers/alerts/use_alert_prevalence';
import { isActiveTimeline } from '../../../helpers';

export interface UseFetchRelatedAlertsBySameSourceEventParams {
  /**
   * An array of field objects with category and value
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[] | null;
  /**
   * Maintain backwards compatibility // TODO remove when possible
   */
  scopeId: string;
}
export interface UseFetchRelatedAlertsBySameSourceEventValue {
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
  dataFormattedForFieldBrowser,
  scopeId,
}: UseFetchRelatedAlertsBySameSourceEventParams): UseFetchRelatedAlertsBySameSourceEventValue => {
  const sourceEventField = find(
    { category: 'kibana', field: 'kibana.alert.original_event.id' },
    dataFormattedForFieldBrowser
  );
  const { field, values } = sourceEventField || { field: '', values: [] };
  const { loading, error, count, alertIds } = useAlertPrevalence({
    field,
    value: values,
    isActiveTimelines: isActiveTimeline(scopeId),
    signalIndexName: null,
    includeAlertIds: true,
  });

  return {
    loading,
    error,
    data: alertIds || [],
    dataCount: count || 0,
  };
};
