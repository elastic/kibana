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
import { FilterInOut } from '../../../query_bar/components/filter_in_out';
import { AddToTimeline } from '../../../timeline/components/add_to_timeline';
import { getIndicatorFieldAndValue } from '../../lib/field_value';

interface IndicatorValueActions {
  indicator: Indicator;
  Component?: typeof EuiButtonEmpty | typeof EuiButtonIcon;
  field: string;
  testId?: string;
}

export const IndicatorValueActions: VFC<IndicatorValueActions> = ({
  indicator,
  field,
  testId,
  Component,
}) => {
  const { key, value } = getIndicatorFieldAndValue(indicator, field);

  if (!key || value === EMPTY_VALUE || !key) {
    return null;
  }

  return (
    <>
      <FilterInOut as={Component} data={indicator} field={field} />
      <AddToTimeline as={Component} data={indicator} field={field} testId={testId} />
    </>
  );
};
