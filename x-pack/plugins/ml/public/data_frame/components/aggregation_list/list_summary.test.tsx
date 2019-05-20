/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { PivotAggsConfig, PIVOT_SUPPORTED_AGGS } from '../../common';

import { AggListSummary, AggListSummaryProps } from './list_summary';

describe('Data Frame: <AggListSummary />', () => {
  test('Minimal initialization', () => {
    const item: PivotAggsConfig = {
      agg: PIVOT_SUPPORTED_AGGS.AVG,
      field: 'the-field',
      aggName: 'the-form-row-label',
    };
    const props: AggListSummaryProps = {
      list: { 'the-agg': item },
    };

    const wrapper = shallow(<AggListSummary {...props} />);

    expect(wrapper).toMatchSnapshot();
  });
});
