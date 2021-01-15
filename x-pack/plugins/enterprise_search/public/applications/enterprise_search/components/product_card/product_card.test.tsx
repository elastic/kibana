/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setMockValues, mockTelemetryActions } from '../../../__mocks__';

import React from 'react';
import { shallow } from 'enzyme';

import { EuiCard } from '@elastic/eui';
import { EuiButtonTo } from '../../../shared/react_router_helpers';
import { APP_SEARCH_PLUGIN, WORKPLACE_SEARCH_PLUGIN } from '../../../../../common/constants';

import { ProductCard } from './';

describe('ProductCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders an App Search card', () => {
    const wrapper = shallow(<ProductCard product={APP_SEARCH_PLUGIN} image="as.jpg" />);
    const card = wrapper.find(EuiCard).dive().shallow();

    expect(card.find('h2').text()).toEqual('Elastic App Search');
    expect(card.find('.productCard__image').prop('src')).toEqual('as.jpg');

    const button = card.find(EuiButtonTo);
    expect(button.prop('to')).toEqual('/app/enterprise_search/app_search');
    expect(button.prop('children')).toEqual('Launch App Search');

    button.simulate('click');
    expect(mockTelemetryActions.sendEnterpriseSearchTelemetry).toHaveBeenCalledWith({
      action: 'clicked',
      metric: 'app_search',
    });
  });

  it('renders a Workplace Search card', () => {
    const wrapper = shallow(<ProductCard product={WORKPLACE_SEARCH_PLUGIN} image="ws.jpg" />);
    const card = wrapper.find(EuiCard).dive().shallow();

    expect(card.find('h2').text()).toEqual('Elastic Workplace Search');
    expect(card.find('.productCard__image').prop('src')).toEqual('ws.jpg');

    const button = card.find(EuiButtonTo);
    expect(button.prop('to')).toEqual('/app/enterprise_search/workplace_search');
    expect(button.prop('children')).toEqual('Launch Workplace Search');

    button.simulate('click');
    expect(mockTelemetryActions.sendEnterpriseSearchTelemetry).toHaveBeenCalledWith({
      action: 'clicked',
      metric: 'workplace_search',
    });
  });

  it('renders correct button text when host not present', () => {
    setMockValues({ config: { host: '' } });

    const wrapper = shallow(<ProductCard product={WORKPLACE_SEARCH_PLUGIN} image="ws.jpg" />);
    const card = wrapper.find(EuiCard).dive().shallow();
    const button = card.find(EuiButtonTo);

    expect(button.prop('children')).toEqual('Setup Workplace Search');
  });
});
