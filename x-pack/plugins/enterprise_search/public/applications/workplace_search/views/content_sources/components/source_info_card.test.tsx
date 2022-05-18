/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiBadge, EuiHealth, EuiText, EuiTitle } from '@elastic/eui';

import { SourceIcon } from '../../../components/shared/source_icon';

import { ContentSourceFullData } from '../../../types';

import { SourceInfoCard } from './source_info_card';

describe('SourceInfoCard', () => {
  const contentSource = {
    name: 'source',
    serviceType: 'custom',
    createdAt: '2021-01-20',
    isFederatedSource: true,
  } as ContentSourceFullData;

  it('renders', () => {
    const wrapper = shallow(<SourceInfoCard contentSource={contentSource} />);

    expect(wrapper.find(SourceIcon)).toHaveLength(1);
    expect(wrapper.find(EuiBadge)).toHaveLength(1);
    expect(wrapper.find(EuiHealth)).toHaveLength(1);
    expect(wrapper.find(EuiText)).toHaveLength(1);
    expect(wrapper.find(EuiTitle)).toHaveLength(1);
  });
});
