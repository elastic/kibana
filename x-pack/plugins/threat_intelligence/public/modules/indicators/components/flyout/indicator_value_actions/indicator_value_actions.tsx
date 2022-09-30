/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC } from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { Indicator } from '../../../../../../common/types/indicator';
import { FilterInButtonIcon } from '../../../../query_bar/components/filter_in';
import { FilterOutButtonIcon } from '../../../../query_bar/components/filter_out';
import { AddToTimelineButtonIcon } from '../../../../timeline/components/add_to_timeline';
import { fieldAndValueValid, getIndicatorFieldAndValue } from '../../../utils/field_value';

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
   * Used for unit and e2e tests.
   */
  ['data-test-subj']?: string;
}

export const IndicatorValueActions: VFC<IndicatorValueActions> = ({
  indicator,
  field,
  'data-test-subj': dataTestSubj,
}) => {
  const { key, value } = getIndicatorFieldAndValue(indicator, field);
  if (!fieldAndValueValid(key, value)) {
    return null;
  }

  const filterInTestId = `${dataTestSubj}${FILTER_IN_BUTTON_TEST_ID}`;
  const filterOutTestId = `${dataTestSubj}${FILTER_OUT_BUTTON_TEST_ID}`;
  const timelineTestId = `${dataTestSubj}${TIMELINE_BUTTON_TEST_ID}`;

  return (
    <EuiFlexGroup justifyContent="center" alignItems="center">
      <FilterInButtonIcon data={indicator} field={field} data-test-subj={filterInTestId} />
      <FilterOutButtonIcon data={indicator} field={field} data-test-subj={filterOutTestId} />
      <AddToTimelineButtonIcon data={indicator} field={field} data-test-subj={timelineTestId} />
    </EuiFlexGroup>
  );
};
