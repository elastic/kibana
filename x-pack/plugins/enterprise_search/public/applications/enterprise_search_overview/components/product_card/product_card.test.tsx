/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, mockTelemetryActions } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCard, EuiListGroup, EuiPanel } from '@elastic/eui';

import {
  APP_SEARCH_PLUGIN,
  ELASTICSEARCH_PLUGIN,
  WORKPLACE_SEARCH_PLUGIN,
} from '../../../../../common/constants';
import { EuiButtonTo, EuiButtonEmptyTo } from '../../../shared/react_router_helpers';

import { ProductCard } from '.';

describe('ProductCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders an Elasticsearch card', () => {
    const wrapper = shallow(<ProductCard product={ELASTICSEARCH_PLUGIN} />);
    const card = wrapper.find(EuiPanel);
    const button = card.find(EuiButtonTo);

    expect(card.find('h3').text()).toEqual('Elasticsearch');
    expect(card.find(EuiListGroup).children()).toHaveLength(ELASTICSEARCH_PLUGIN.FEATURES.length);
    expect(button).toHaveLength(1);
    expect(card.find(EuiButtonEmptyTo)).toHaveLength(0);
    expect(card.find('[data-test-subj="productCard-resources"]').text()).toEqual('Resources');
    expect(card.find('[data-test-subj="productCard-resourceLinks"]').children()).toHaveLength(ELASTICSEARCH_PLUGIN.RESOURCE_LINKS.length);
    expect(card.find(EuiButtonTo).prop('to')).toEqual(ELASTICSEARCH_PLUGIN.URL)

    button.simulate('click');
    expect(mockTelemetryActions.sendEnterpriseSearchTelemetry).toHaveBeenCalledWith({
      action: 'clicked',
      metric: 'elasticsearch',
    });
  });

  it('renders an App Search card', () => {
    const wrapper = shallow(<ProductCard product={APP_SEARCH_PLUGIN} />);
    const card = wrapper.find(EuiPanel);
    const button = card.find(EuiButtonEmptyTo);

    expect(card.find('h3').text()).toEqual('App Search');

    expect(card.find(EuiListGroup).children()).toHaveLength(APP_SEARCH_PLUGIN.FEATURES.length);
    // App Search and Workplace Search cards have empty buttons
    expect(card.find(EuiButtonTo)).toHaveLength(0);
    expect(button).toHaveLength(1);
    expect(card.find('[data-test-subj="productCard-resources"]').text()).toEqual('Resources');
    expect(card.find('[data-test-subj="productCard-resourceLinks"]').children()).toHaveLength(APP_SEARCH_PLUGIN.RESOURCE_LINKS.length);
    expect(card.find(EuiButtonEmptyTo).prop('to')).toEqual(APP_SEARCH_PLUGIN.URL)

    button.simulate('click');
    expect(mockTelemetryActions.sendEnterpriseSearchTelemetry).toHaveBeenCalledWith({
      action: 'clicked',
      metric: 'app_search',
    });
  });

  it('renders a Workplace Search card', () => {
    const wrapper = shallow(<ProductCard product={WORKPLACE_SEARCH_PLUGIN} />);
    const card = wrapper.find(EuiPanel);
    const button = card.find(EuiButtonEmptyTo);

    expect(card.find('h3').text()).toEqual('Workplace Search');

    // App Search and Workplace Search cards have empty buttons
    expect(card.find(EuiButtonTo)).toHaveLength(0);
    expect(button).toHaveLength(1);
    expect(card.find('[data-test-subj="productCard-resources"]').text()).toEqual('Resources');
    expect(card.find('[data-test-subj="productCard-resourceLinks"]').children()).toHaveLength(WORKPLACE_SEARCH_PLUGIN.RESOURCE_LINKS.length);
    expect(card.find(EuiButtonEmptyTo).prop('to')).toEqual(WORKPLACE_SEARCH_PLUGIN.URL)

    button.simulate('click');
    expect(mockTelemetryActions.sendEnterpriseSearchTelemetry).toHaveBeenCalledWith({
      action: 'clicked',
      metric: 'workplace_search',
    });
  });
});
