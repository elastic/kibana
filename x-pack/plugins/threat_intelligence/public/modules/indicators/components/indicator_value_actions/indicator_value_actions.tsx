/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui';
import React, { VFC } from 'react';
import { EMPTY_VALUE } from '../../../../../common/constants';
import { Indicator } from '../../../../../common/types/indicator';
import { FilterIn } from '../../../query_bar/components/filter_in';
import { FilterOut } from '../../../query_bar/components/filter_out';
import { AddToTimeline } from '../../../timeline/components/add_to_timeline';
import { getIndicatorFieldAndValue } from '../../lib/field_value';

export const TIMELINE_BUTTON_TEST_ID = 'TimelineButton';
export const FILTER_IN_BUTTON_TEST_ID = 'FilterInButton';
export const FILTER_OUT_BUTTON_TEST_ID = 'FilterOutButton';

interface IndicatorValueActions {
  /**
   * Indicator complete object.
   */
  indicator: Indicator;
  /**
   * Indicator field used for the filter in/out and add to timeline feature.
   */
  field: string;
  /**
   * Only used with `EuiDataGrid` (see {@link AddToTimelineButtonProps}).
   */
  Component?: typeof EuiButtonEmpty | typeof EuiButtonIcon;
  /**
   * Used for unit and e2e tests.
   */
  ['data-test-subj']?: string;
}

export const IndicatorValueActions: VFC<IndicatorValueActions> = ({
  indicator,
  field,
  Component,
  ...props
}) => {
  const { key, value } = getIndicatorFieldAndValue(indicator, field);

  if (!key || value === EMPTY_VALUE || !key) {
    return null;
  }

  const filterInTestId = `${props['data-test-subj']}${FILTER_IN_BUTTON_TEST_ID}`;
  const filterOutTestId = `${props['data-test-subj']}${FILTER_OUT_BUTTON_TEST_ID}`;
  const timelineTestId = `${props['data-test-subj']}${TIMELINE_BUTTON_TEST_ID}`;

  return (
    <>
      <FilterIn as={Component} data={indicator} field={field} data-test-subj={filterInTestId} />
      <FilterOut as={Component} data={indicator} field={field} data-test-subj={filterOutTestId} />
      <AddToTimeline
        as={Component}
        data={indicator}
        field={field}
        data-test-subj={timelineTestId}
      />
    </>
  );
};
