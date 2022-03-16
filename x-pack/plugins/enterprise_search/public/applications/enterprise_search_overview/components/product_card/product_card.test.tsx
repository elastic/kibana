/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, mockTelemetryActions } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCard } from '@elastic/eui';

import { APP_SEARCH_PLUGIN, WORKPLACE_SEARCH_PLUGIN } from '../../../../../common/constants';
import { EuiButtonTo } from '../../../shared/react_router_helpers';

import { ProductCard } from './';

describe('ProductCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders an App Search card', () => {
    const wrapper = shallow(<ProductCard product={APP_SEARCH_PLUGIN} />);
    const card = wrapper.find(EuiCard).dive().shallow();

    expect(card.find('h2').text()).toEqual('Elastic App Search');

    const button = card.find(EuiButtonTo);
    expect(button.prop('to')).toEqual('/app/enterprise_search/app_search');
    expect(button.prop('children')).toEqual('Open App Search');

    button.simulate('click');
    expect(mockTelemetryActions.sendEnterpriseSearchTelemetry).toHaveBeenCalledWith({
      action: 'clicked',
      metric: 'app_search',
    });
  });

  it('renders a Workplace Search card', () => {
    const wrapper = shallow(<ProductCard product={WORKPLACE_SEARCH_PLUGIN} />);
    const card = wrapper.find(EuiCard).dive().shallow();

    expect(card.find('h2').text()).toEqual('Elastic Workplace Search');

    const button = card.find(EuiButtonTo);
    expect(button.prop('to')).toEqual('/app/enterprise_search/workplace_search');
    expect(button.prop('children')).toEqual('Open Workplace Search');

    button.simulate('click');
    expect(mockTelemetryActions.sendEnterpriseSearchTelemetry).toHaveBeenCalledWith({
      action: 'clicked',
      metric: 'workplace_search',
    });
  });

  it('renders correct button text when host not present', () => {
    setMockValues({ config: { host: '' } });

    const wrapper = shallow(<ProductCard product={WORKPLACE_SEARCH_PLUGIN} />);
    const card = wrapper.find(EuiCard).dive().shallow();
    const button = card.find(EuiButtonTo);

    expect(button.prop('children')).toEqual('Set up Workplace Search');
  });
});
