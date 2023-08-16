/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrevalenceOverviewSummaryRow } from '../components/prevalence_overview';
import { useFetchPrevalence } from '../../shared/hooks/use_fetch_prevalence';
import { FIELD_NAMES_AGG_KEY, HOSTS_AGG_KEY } from '../../shared/utils/fetch_data';

const PERCENTAGE_THRESHOLD = 0.1; // we show the prevalence if its value is below 10%

export interface UsePrevalenceParams {
  /**
   * The highlighted field name and values, already formatted for the query
   * */
  highlightedFields: { [key: string]: { match: { [key: string]: string } } };
  /**
   * The from and to values for the query
   */
  interval: { from: string; to: string };
}

export interface UsePrevalenceResult {
  /**
   * Returns true if data is being loaded
   */
  loading: boolean;
  /**
   * Returns true if fetching data has errored out
   */
  error: boolean;
  /**
   * Returns the prevalence data formatted for the InsightsSummaryRow component
   */
  data: PrevalenceOverviewSummaryRow[];
}

/**
 * Hook to fetch the prevalence data, then prepares the data to be consumed by the InsightsSummaryRow component
 * in the PrevalenceOverview component
 */
export const usePrevalence = ({
  highlightedFields,
  interval,
}: UsePrevalenceParams): UsePrevalenceResult => {
  const { data, loading, error } = useFetchPrevalence({ highlightedFields, interval });

  const items: PrevalenceOverviewSummaryRow[] = [];

  if (data) {
    // total number of unique hosts in the environment
    const uniqueHostsInEnvironment = data.aggregations[HOSTS_AGG_KEY].buckets.length;

    const fieldNames = Object.keys(data.aggregations[FIELD_NAMES_AGG_KEY].buckets);

    fieldNames.forEach((fieldName: string) => {
      const fieldValue = highlightedFields[fieldName].match[fieldName];

      // number of unique hosts in which the current field/value pair is present
      const uniqueHostsForCurrentFieldValuePair =
        data.aggregations[FIELD_NAMES_AGG_KEY].buckets[fieldName].hostName.buckets.length;

      // calculate host prevalence
      const hostPrevalence = uniqueHostsInEnvironment
        ? uniqueHostsForCurrentFieldValuePair / uniqueHostsInEnvironment
        : 0;

      if (isFinite(hostPrevalence) && hostPrevalence > 0 && hostPrevalence < PERCENTAGE_THRESHOLD) {
        items.push({
          field: fieldName,
          value: fieldValue,
        });
      }
    });
  }

  return {
    loading,
    error,
    data: items,
  };
};
