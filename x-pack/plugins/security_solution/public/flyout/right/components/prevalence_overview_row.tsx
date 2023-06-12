/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VFC } from 'react';
import React from 'react';
import { PREVALENCE_ROW_UNCOMMON } from './translations';
import { useFetchUniqueHostsWithFieldPair } from '../hooks/use_fetch_unique_hosts_with_field_value_pair';
import { useFetchUniqueHosts } from '../hooks/use_fetch_unique_hosts';
import { InsightsSummaryRow } from './insights_summary_row';
import { TimelineId } from '../../../../common/types';

const PERCENTAGE_THRESHOLD = 0.1; // we show the prevalence if its value is below 10%

export interface PrevalenceOverviewRowProps {
  /**
   * Highlighted field
   */
  field: string;
  /**
   * Highlighted field value
   */
  values: string[];
  /**
   * Maintain backwards compatibility // TODO remove when possible
   */
  scopeId: string;
  /**
   * This is a solution to allow the parent component to NOT render if all its row children are null
   */
  callbackIfNull: () => void;
  /**
   *  Prefix data-test-subj because this component will be used in multiple places
   */
  ['data-test-subj']?: string;
}

/**
 * Retrieves the unique hosts for the field/value pair as well as the total number of unique hosts,
 * calculate the prevalence. If the prevalence is higher than 1, use the callback method to let the parent know
 * the row will render null.
 */
export const PrevalenceOverviewRow: VFC<PrevalenceOverviewRowProps> = ({
  field,
  values,
  scopeId,
  callbackIfNull,
  'data-test-subj': dataTestSubj,
}) => {
  const isActiveTimelines = scopeId === TimelineId.active;

  const {
    loading: hostsLoading,
    error: hostsError,
    count: hostsCount,
  } = useFetchUniqueHostsWithFieldPair({
    field,
    values,
    isActiveTimelines,
  });

  const {
    loading: uniqueHostsLoading,
    error: uniqueHostsError,
    count: uniqueHostsCount,
  } = useFetchUniqueHosts();

  // prevalence is number of host(s) where the field/value pair was found divided by the total number of hosts in the environment
  const prevalence = hostsCount / uniqueHostsCount;
  const loading = hostsLoading || uniqueHostsLoading;
  const error = hostsError || uniqueHostsError;
  const text = `${field}, ${values} ${PREVALENCE_ROW_UNCOMMON}`;

  // we do not want to render the row is the prevalence is Infinite, 0 or above the decided threshold
  const shouldNotRender =
    isFinite(prevalence) && (prevalence === 0 || prevalence > PERCENTAGE_THRESHOLD);

  // callback to let the parent component aware of which rows are null (so it can hide itself completely if all are null)
  if (!loading && (error || shouldNotRender)) {
    callbackIfNull();
  }

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
