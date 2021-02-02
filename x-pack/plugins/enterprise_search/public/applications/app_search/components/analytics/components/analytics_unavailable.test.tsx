/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { EuiEmptyPrompt } from '@elastic/eui';

import { FlashMessages } from '../../../../shared/flash_messages';

import { AnalyticsUnavailable } from './';

describe('AnalyticsUnavailable', () => {
  it('renders', () => {
    const wrapper = shallow(<AnalyticsUnavailable />);

    expect(wrapper.find(FlashMessages)).toHaveLength(1);
    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);
  });
});
