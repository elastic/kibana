/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';

import { BucketSpanEstimator } from './bucket_span_estimator_view';

describe('BucketSpanEstimator', () => {

  test('renders the button', () => {
    const props = {
      buttonDisabled: false,
      estimatorRunning: false,
      guessBucketSpan: () => { },
      buttonText: 'Estimate bucket span'
    };
    const wrapper = shallowWithIntl(<BucketSpanEstimator {...props} />);
    expect(wrapper).toMatchSnapshot();
  });

  test('renders the loading button', () => {
    const props = {
      buttonDisabled: true,
      estimatorRunning: true,
      guessBucketSpan: () => { },
      buttonText: 'Estimating bucket span'
    };
    const wrapper = shallowWithIntl(<BucketSpanEstimator {...props} />);
    expect(wrapper).toMatchSnapshot();
  });
});
