/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setMockValues } from '../../../../__mocks__/kea.mock';

jest.mock('../messaging', () => ({
  AnalyticsLogRetentionMessage: jest.fn(),
  ApiLogRetentionMessage: jest.fn(),
}));
import { AnalyticsLogRetentionMessage, ApiLogRetentionMessage } from '../messaging';

import React from 'react';
import { shallow, mount } from 'enzyme';
import { EuiIconTip } from '@elastic/eui';

import { LogRetentionOptions } from '../';
import { LogRetentionTooltip } from './';

describe('LogRetentionTooltip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues({ logRetentionLogic: {} });
  });

  it('renders an analytics tooltip', () => {
    const wrapper = shallow(<LogRetentionTooltip type={LogRetentionOptions.Analytics} />);
    const tooltipContent = wrapper.find(EuiIconTip).prop('content') as React.ReactElement;

    expect(tooltipContent.type).toEqual(AnalyticsLogRetentionMessage);
  });

  it('renders an API tooltip', () => {
    const wrapper = shallow(<LogRetentionTooltip type={LogRetentionOptions.API} />);
    const tooltipContent = wrapper.find(EuiIconTip).prop('content') as React.ReactElement;

    expect(tooltipContent.type).toEqual(ApiLogRetentionMessage);
  });

  it('passes custom tooltip positions', () => {
    const wrapper = shallow(<LogRetentionTooltip type={LogRetentionOptions.API} />);
    expect(wrapper.find(EuiIconTip).prop('position')).toEqual('bottom');

    wrapper.setProps({ position: 'right' });
    expect(wrapper.find(EuiIconTip).prop('position')).toEqual('right');
  });

  it('does not render if ILM is not available', () => {
    setMockValues({ logRetention: null });
    const wrapper = mount(<LogRetentionTooltip type={LogRetentionOptions.API} />);

    expect(wrapper.isEmptyRender()).toBe(true);
  });
});
