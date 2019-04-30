/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { AggName, PIVOT_SUPPORTED_AGGS, PivotAggsConfig } from '../../common';

import { PopoverForm } from './popover_form';

describe('Data Frame: Aggregation <PopoverForm />', () => {
  test('Minimal initialization', () => {
    const defaultData: PivotAggsConfig = {
      agg: PIVOT_SUPPORTED_AGGS.CARDINALITY,
      aggName: 'the-agg-name',
      field: 'the-field',
    };
    const otherAggNames: AggName[] = [];
    const onChange = (item: PivotAggsConfig) => {};

    const wrapper = shallow(
      <PopoverForm
        defaultData={defaultData}
        otherAggNames={otherAggNames}
        options={{}}
        onChange={onChange}
      />
    );

    expect(wrapper).toMatchSnapshot();
  });
});
