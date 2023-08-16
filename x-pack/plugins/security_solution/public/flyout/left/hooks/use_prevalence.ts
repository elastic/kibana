/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetchPrevalence } from '../../shared/hooks/use_fetch_prevalence';
import type { AggregationValue } from '../../shared/utils/fetch_data';
import {
  EVENT_KIND_AGG_KEY,
  FIELD_NAMES_AGG_KEY,
  HOST_NAME_AGG_KEY,
  HOSTS_AGG_KEY,
  USER_NAME_AGG_KEY,
  USERS_AGG_KEY,
} from '../../shared/utils/fetch_data';
import { EventKind } from '../../shared/constants/event_kinds';
import type { PrevalenceDetailsTableRow } from '../components/prevalence_details';

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
   * Returns the prevalence data formatted for the EuiInMemoryTable component
   */
  data: PrevalenceDetailsTableRow[];
}

/**
 * Hook to fetch the prevalence data, then prepares the data to be consumed by the EuiInMemoryTable component
 * in the PrevalenceDetails component
 */
export const usePrevalence = ({
  highlightedFields,
  interval,
}: UsePrevalenceParams): UsePrevalenceResult => {
  const { data, loading, error } = useFetchPrevalence({ highlightedFields, interval });

  const items: PrevalenceDetailsTableRow[] = [];

  if (data) {
    // total number of unique hosts in the environment
    const uniqueHostsInEnvironment = data.aggregations[HOSTS_AGG_KEY].buckets.length;

    // total number of unique users in the environment
    const uniqueUsersInEnvironment = data.aggregations[USERS_AGG_KEY].buckets.length;

    const fieldNames = Object.keys(data.aggregations[FIELD_NAMES_AGG_KEY].buckets);

    fieldNames.forEach((fieldName: string) => {
      const fieldValue = highlightedFields[fieldName].match[fieldName];

      // retrieves the number of signals for the current field/value pair
      const alertCount =
        data.aggregations[FIELD_NAMES_AGG_KEY].buckets[fieldName][EVENT_KIND_AGG_KEY].buckets.find(
          (aggregationValue: AggregationValue) => aggregationValue.key === EventKind.signal
        )?.doc_count || 0;

      // calculate the number of documents (non-signal) for the current field/value pair
      let docCount = 0;
      data.aggregations[FIELD_NAMES_AGG_KEY].buckets[fieldName][EVENT_KIND_AGG_KEY].buckets.reduce(
        (acc, curr) => {
          if (curr.key !== EventKind.signal) {
            docCount += curr.doc_count;
          }
          return acc;
        },
        docCount
      );

      // number of unique hosts in which the current field/value pair is present
      const uniqueHostsForCurrentFieldValuePair =
        data.aggregations[FIELD_NAMES_AGG_KEY].buckets[fieldName][HOST_NAME_AGG_KEY].buckets.length;

      // number of unique users in which the current field/value pair is present
      const uniqueUsersForCurrentFieldValuePair =
        data.aggregations[FIELD_NAMES_AGG_KEY].buckets[fieldName][USER_NAME_AGG_KEY].buckets.length;

      // calculate host prevalence
      const hostPrevalence = uniqueHostsInEnvironment
        ? uniqueHostsForCurrentFieldValuePair / uniqueHostsInEnvironment
        : 0;

      // calculate user prevalence
      const userPrevalence = uniqueUsersInEnvironment
        ? uniqueUsersForCurrentFieldValuePair / uniqueUsersInEnvironment
        : 0;

      items.push({
        field: fieldName,
        value: fieldValue,
        alertCount,
        docCount,
        hostPrevalence,
        userPrevalence,
      });
    });
  }

  return {
    loading,
    error,
    data: items,
  };
};
