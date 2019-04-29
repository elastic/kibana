/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { PIVOT_SUPPORTED_AGGS } from '../../common';

import { AggListForm, ListProps } from './list_form';

describe('Data Frame: <AggListForm />', () => {
  test('Minimal initialization', () => {
    const props: ListProps = {
      list: ['the-agg'],
      optionsData: {
        'the-agg': {
          agg: PIVOT_SUPPORTED_AGGS.AVG,
          field: 'the-field',
          formRowLabel: 'the-form-row-label',
        },
      },
    };

    const wrapper = shallow(<AggListForm {...props} />);

    expect(wrapper).toMatchSnapshot();
  });
});
