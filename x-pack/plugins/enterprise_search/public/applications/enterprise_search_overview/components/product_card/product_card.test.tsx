/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockTelemetryActions } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { snakeCase } from 'lodash';

import { EuiListGroup, EuiPanel } from '@elastic/eui';

import { EuiButtonTo, EuiButtonEmptyTo } from '../../../shared/react_router_helpers';

import { ProductCard, ProductCardProps } from './product_card';

const MOCK_VALUES: ProductCardProps = {
  cta: 'Click me',
  description: 'Mock description',
  features: ['first feature', 'second feature'],
  icon: 'logoElasticsearch',
  name: 'Mock product',
  productId: 'mockProduct',
  resourceLinks: [
    {
      label: 'Link one',
      to: 'https://www.elastic.co/guide/one',
    },
    {
      label: 'Link twwo',
      to: 'https://www.elastic.co/guide/two',
    },
  ],
  url: '/app/mock_app',
};

describe('ProductCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a product card', () => {
    const wrapper = shallow(<ProductCard {...MOCK_VALUES} />);
    const card = wrapper.find(EuiPanel);

    expect(card.find('h3').text()).toEqual(MOCK_VALUES.name);
    expect(card.find(EuiListGroup).children()).toHaveLength(MOCK_VALUES.features.length);
    expect(card.find('[data-test-subj="productCard-resources"]').text()).toEqual('Resources');
    expect(card.find('[data-test-subj="productCard-resourceLinks"]').children()).toHaveLength(
      MOCK_VALUES.resourceLinks.length
    );

    const button = card.find(EuiButtonEmptyTo);

    expect(button).toHaveLength(1);
    expect(button.prop('to')).toEqual(MOCK_VALUES.url);
    expect(card.find(EuiButtonTo)).toHaveLength(0);

    button.simulate('click');

    expect(mockTelemetryActions.sendEnterpriseSearchTelemetry).toHaveBeenCalledWith({
      action: 'clicked',
      metric: snakeCase(MOCK_VALUES.productId),
    });
  });

  it('renders an empty cta', () => {
    const wrapper = shallow(<ProductCard {...MOCK_VALUES} emptyCta />);
    const card = wrapper.find(EuiPanel);
    const button = card.find(EuiButtonTo);

    expect(button).toHaveLength(1);
    expect(button.prop('to')).toEqual(MOCK_VALUES.url);
    expect(card.find(EuiButtonEmptyTo)).toHaveLength(0);

    button.simulate('click');
    expect(mockTelemetryActions.sendEnterpriseSearchTelemetry).toHaveBeenCalledWith({
      action: 'clicked',
      metric: snakeCase(MOCK_VALUES.productId),
    });
  });
});
