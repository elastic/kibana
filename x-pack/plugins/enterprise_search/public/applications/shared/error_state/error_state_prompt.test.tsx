/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../__mocks__/shallow_usecontext.mock';

import React from 'react';
import { shallow } from 'enzyme';
import { EuiEmptyPrompt } from '@elastic/eui';

import { ErrorStatePrompt } from './';

describe('ErrorState', () => {
  it('renders', () => {
    const wrapper = shallow(<ErrorStatePrompt />);

    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);
  });
});
