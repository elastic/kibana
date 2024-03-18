/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { PIVOT_SUPPORTED_AGGS } from '../../../../../../common/types/pivot_aggs';

import type { PivotAggsConfig } from '../../../../common';

import type { AggListSummaryProps } from './list_summary';
import { AggListSummary } from './list_summary';

describe('Transform: <AggListSummary />', () => {
  test('Minimal initialization', () => {
    const item: PivotAggsConfig = {
      agg: PIVOT_SUPPORTED_AGGS.AVG,
      field: 'the-field',
      aggName: 'the-group-by-agg-name',
      dropDownName: 'the-group-by-drop-down-name',
    };
    const props: AggListSummaryProps = {
      list: { 'the-agg': item },
    };

    const { container } = render(<AggListSummary {...props} />);

    expect(container.textContent).toBe('the-agg');
  });
});
