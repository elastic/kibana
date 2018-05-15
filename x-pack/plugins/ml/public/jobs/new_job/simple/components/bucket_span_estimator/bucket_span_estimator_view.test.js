/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { BucketSpanEstimator } from './bucket_span_estimator_view';

jest.mock('ui/chrome', () => { }, { virtual: true });

describe('BucketSpanEstimator', () => {
  const props = {
    buttonDisabled: false,
    estimatorRunning: false,
    guessBucketSpan: function () {},
    buttonText: 'Estimate bucket span'
  };

  const component = (
    <BucketSpanEstimator {...props} />
  );

  const wrapper = shallow(component);

  test('renders the button', () => {
    expect(wrapper).toMatchSnapshot();
  });

  props.buttonDisabled = true;
  props.estimatorRunning = true;
  props.buttonText = 'Estimating bucket span';
  wrapper.setProps(props);

  test('renders the loading button', () => {
    expect(wrapper).toMatchSnapshot();
  });
});
