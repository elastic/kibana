/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { PivotGroupByConfig, PIVOT_SUPPORTED_GROUP_BY_AGGS } from '../../common';

import { GroupByListSummary } from './list_summary';

describe('Data Frame: <GroupByListSummary />', () => {
  test('Minimal initialization', () => {
    const item: PivotGroupByConfig = {
      agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS,
      field: 'the-group-by-field',
      aggName: 'the-group-by-label',
    };
    const props = {
      list: { 'the-options-data-id': item },
    };

    const wrapper = shallow(<GroupByListSummary {...props} />);

    expect(wrapper).toMatchSnapshot();
  });
});
