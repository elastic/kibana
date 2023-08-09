/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VFC } from 'react';
import React from 'react';
import { EuiIcon, EuiLoadingSpinner } from '@elastic/eui';
import {
  PREVALENCE_DETAILS_PREVALENCE_CELL_ERROR_TEST_ID,
  PREVALENCE_DETAILS_PREVALENCE_CELL_LOADING_TEST_ID,
  PREVALENCE_DETAILS_PREVALENCE_CELL_VALUE_TEST_ID,
} from './test_ids';
import { useFetchFieldValuePairWithAggregation } from '../../shared/hooks/use_fetch_field_value_pair_with_aggregation';
import { useFetchUniqueByField } from '../../shared/hooks/use_fetch_unique_by_field';

export interface PrevalenceDetailsPrevalenceCellProps {
  /**
   * The highlighted field name and values
   * */
  highlightedField: { name: string; values: string[] };
  /**
   * The aggregation field
   */
  aggregationField: string;
}

/**
 * Component displaying a value in many PrevalenceDetails table cells. It is used for the fifth and sixth columns,
 * which displays the prevalence percentage for host.name and user.name fields.
 */
export const PrevalenceDetailsPrevalenceCell: VFC<PrevalenceDetailsPrevalenceCellProps> = ({
  highlightedField,
  aggregationField,
}) => {
  const {
    loading: aggregationLoading,
    error: aggregationError,
    count: aggregationCount,
  } = useFetchFieldValuePairWithAggregation({
    highlightedField,
    aggregationField,
  });

  const {
    loading: uniqueLoading,
    error: uniqueError,
    count: uniqueCount,
  } = useFetchUniqueByField({ field: aggregationField });

  if (aggregationLoading || uniqueLoading) {
    return (
      <EuiLoadingSpinner data-test-subj={PREVALENCE_DETAILS_PREVALENCE_CELL_LOADING_TEST_ID} />
    );
  }

  const prevalence = aggregationCount / uniqueCount;
  if (aggregationError || uniqueError || !isFinite(prevalence)) {
    return (
      <EuiIcon
        data-test-subj={PREVALENCE_DETAILS_PREVALENCE_CELL_ERROR_TEST_ID}
        type="error"
        color="danger"
      />
    );
  }

  return (
    <div data-test-subj={PREVALENCE_DETAILS_PREVALENCE_CELL_VALUE_TEST_ID}>
      {Math.round(prevalence * 100)}
      {'%'}
    </div>
  );
};

PrevalenceDetailsPrevalenceCell.displayName = 'PrevalenceDetailsPrevalenceCell';
