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
  PREVALENCE_DETAILS_COUNT_CELL_ERROR_TEST_ID,
  PREVALENCE_DETAILS_COUNT_CELL_LOADING_TEST_ID,
  PREVALENCE_DETAILS_COUNT_CELL_VALUE_TEST_ID,
} from './test_ids';
import type { EventType } from '../../shared/hooks/use_fetch_field_value_pair_by_event_type';
import { useFetchFieldValuePairByEventType } from '../../shared/hooks/use_fetch_field_value_pair_by_event_type';

export interface PrevalenceDetailsCountCellProps {
  /**
   * The highlighted field name and values
   * */
  highlightedField: { name: string; values: string[] };
  /**
   * Limit the search to include or exclude a specific value for the event.kind field
   * (alert, asset, enrichment, event, metric, state, pipeline_error, signal)
   */
  type: EventType;
}

/**
 * Component displaying a value in many PrevalenceDetails table cells. It is used for the third and fourth columns,
 * which display the number of alerts and documents for a given field/value pair.
 * For the doc columns, type should "signal" for its eventKind property, and exclude set to true.
 * For the alert columns, type should have "signal" for its eventKind property, and include should be true.
 */
export const PrevalenceDetailsCountCell: VFC<PrevalenceDetailsCountCellProps> = ({
  highlightedField,
  type,
}) => {
  const { loading, error, count } = useFetchFieldValuePairByEventType({
    highlightedField,
    type,
  });

  if (loading) {
    return <EuiLoadingSpinner data-test-subj={PREVALENCE_DETAILS_COUNT_CELL_LOADING_TEST_ID} />;
  }

  if (error) {
    return (
      <EuiIcon
        data-test-subj={PREVALENCE_DETAILS_COUNT_CELL_ERROR_TEST_ID}
        type="error"
        color="danger"
      />
    );
  }

  return <div data-test-subj={PREVALENCE_DETAILS_COUNT_CELL_VALUE_TEST_ID}>{count}</div>;
};

PrevalenceDetailsCountCell.displayName = 'PrevalenceDetailsCountCell';
