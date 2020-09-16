/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { AggName } from '../../../../../../common/types/aggregations';
import { PIVOT_SUPPORTED_AGGS } from '../../../../../../common/types/pivot_aggs';

import { PivotAggsConfig } from '../../../../common';

import { PopoverForm } from './popover_form';

describe('Transform: Aggregation <PopoverForm />', () => {
  test('Minimal initialization', () => {
    const defaultData: PivotAggsConfig = {
      agg: PIVOT_SUPPORTED_AGGS.CARDINALITY,
      aggName: 'the-group-by-agg-name',
      dropDownName: 'the-group-by-drop-down-name',
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
