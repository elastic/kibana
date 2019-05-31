/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { PivotGroupByConfig, PIVOT_SUPPORTED_GROUP_BY_AGGS } from '../../common';

import { GroupByLabelForm } from './group_by_label_form';

describe('Data Frame: <GroupByLabelForm />', () => {
  test('Date histogram aggregation', () => {
    const item: PivotGroupByConfig = {
      agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM,
      field: 'the-group-by-field',
      aggName: 'the-group-by-agg-name',
      dropDownName: 'the-group-by-drop-down-name',
      calendar_interval: '1m',
    };
    const props = {
      item,
      otherAggNames: [],
      options: {},
      deleteHandler() {},
      onChange() {},
    };

    const wrapper = shallow(<GroupByLabelForm {...props} />);

    expect(wrapper).toMatchSnapshot();
  });

  test('Histogram aggregation', () => {
    const item: PivotGroupByConfig = {
      agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM,
      field: 'the-group-by-field',
      aggName: 'the-group-by-agg-name',
      dropDownName: 'the-group-by-drop-down-name',
      interval: '100',
    };
    const props = {
      item,
      otherAggNames: [],
      options: {},
      deleteHandler() {},
      onChange() {},
    };

    const wrapper = shallow(<GroupByLabelForm {...props} />);

    expect(wrapper).toMatchSnapshot();
  });

  test('Terms aggregation', () => {
    const item: PivotGroupByConfig = {
      agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS,
      field: 'the-group-by-field',
      aggName: 'the-group-by-agg-name',
      dropDownName: 'the-group-by-drop-down-name',
    };
    const props = {
      item,
      otherAggNames: [],
      options: {},
      deleteHandler() {},
      onChange() {},
    };

    const wrapper = shallow(<GroupByLabelForm {...props} />);

    expect(wrapper).toMatchSnapshot();
  });
});
