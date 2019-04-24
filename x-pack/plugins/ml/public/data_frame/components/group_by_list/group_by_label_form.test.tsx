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
  test('Minimal initialization', () => {
    const item: PivotGroupByConfig = {
      agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS,
      field: 'the-group-by-field',
      formRowLabel: 'the-group-by-label',
    };
    const props = {
      item,
      optionsDataId: 'the-options-data-id',
      deleteHandler() {},
      onChange() {},
    };

    const wrapper = shallow(<GroupByLabelForm {...props} />);

    expect(wrapper).toMatchSnapshot();
  });
});
