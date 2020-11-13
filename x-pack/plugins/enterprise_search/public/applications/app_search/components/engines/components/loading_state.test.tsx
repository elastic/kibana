/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { EuiLoadingContent } from '@elastic/eui';

import { LoadingState } from './';

describe('LoadingState', () => {
  it('renders', () => {
    const wrapper = shallow(<LoadingState />);

    expect(wrapper.find(EuiLoadingContent)).toHaveLength(2);
  });
});
