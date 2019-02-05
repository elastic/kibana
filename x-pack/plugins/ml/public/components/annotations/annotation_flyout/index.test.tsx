/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';

import { AnnotationFlyout } from './index';

describe('AnnotationFlyout', () => {
  test('Initialization.', () => {
    const wrapper = shallowWithIntl(<AnnotationFlyout />);
    expect(wrapper).toMatchSnapshot();
  });
});
