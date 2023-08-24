/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VFC } from 'react';
import React from 'react';
import { PREVALENCE_ROW_UNCOMMON } from './translations';
import { useFetchFieldValuePairWithAggregation } from '../../shared/hooks/use_fetch_field_value_pair_with_aggregation';
import { useFetchUniqueByField } from '../../shared/hooks/use_fetch_unique_by_field';
import { InsightsSummaryRow } from './insights_summary_row';

const HOST_FIELD = 'host.name';
const PERCENTAGE_THRESHOLD = 0.1; // we show the prevalence if its value is below 10%

export interface PrevalenceOverviewRowProps {
  /**
   * The highlighted field name and values
   * */
  highlightedField: { name: string; values: string[] };
  /**
   *  Prefix data-test-subj because this component will be used in multiple places
   */
  ['data-test-subj']?: string;
}

/**
 * Retrieves the unique hosts for the field/value pair as well as the total number of unique hosts,
 * calculate the prevalence. If the prevalence is higher than 0.1, the row will render null.
 */
export const PrevalenceOverviewRow: VFC<PrevalenceOverviewRowProps> = ({
  highlightedField,
  'data-test-subj': dataTestSubj,
}) => {
  const {
    loading: hostsLoading,
    error: hostsError,
    count: hostsCount,
  } = useFetchFieldValuePairWithAggregation({
    highlightedField,
    aggregationField: HOST_FIELD,
  });

  const {
    loading: uniqueHostsLoading,
    error: uniqueHostsError,
    count: uniqueHostsCount,
  } = useFetchUniqueByField({ field: HOST_FIELD });

  const { name, values } = highlightedField;

  // prevalence is number of host(s) where the field/value pair was found divided by the total number of hosts in the environment
  const prevalence = hostsCount / uniqueHostsCount;
  const loading = hostsLoading || uniqueHostsLoading;
  const error = hostsError || uniqueHostsError;
  const text = `${name}, ${values} ${PREVALENCE_ROW_UNCOMMON}`;

  // we do not want to render the row is the prevalence is Infinite, 0 or above the decided threshold
  const shouldNotRender =
    isFinite(prevalence) && (prevalence === 0 || prevalence > PERCENTAGE_THRESHOLD);

  return (
    <InsightsSummaryRow
      loading={loading}
      error={error || shouldNotRender}
      icon={'warning'}
      text={text}
      data-test-subj={dataTestSubj}
    />
  );
};

PrevalenceOverviewRow.displayName = 'PrevalenceOverviewRow';
