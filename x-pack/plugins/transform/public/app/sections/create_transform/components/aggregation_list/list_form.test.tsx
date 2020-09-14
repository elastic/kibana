/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { PIVOT_SUPPORTED_AGGS } from '../../../../../../common/types/pivot_aggs';

import { PivotAggsConfig } from '../../../../common';

import { AggListForm, AggListProps } from './list_form';

describe('Transform: <AggListForm />', () => {
  test('Minimal initialization', () => {
    const item: PivotAggsConfig = {
      agg: PIVOT_SUPPORTED_AGGS.AVG,
      field: 'the-field',
      aggName: 'the-group-by-agg-name',
      dropDownName: 'the-group-by-drop-down-name',
    };
    const props: AggListProps = {
      list: { 'the-agg': item },
      options: {},
      deleteHandler() {},
      onChange() {},
    };

    const wrapper = shallow(<AggListForm {...props} />);

    expect(wrapper).toMatchSnapshot();
  });
});
