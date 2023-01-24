/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCard, EuiButton } from '@elastic/eui';

import { SynonymCard, SynonymIcon } from '.';

describe('SynonymCard', () => {
  const MOCK_SYNONYM_SET = {
    id: 'syn-1234567890',
    synonyms: ['lorem', 'ipsum', 'dolor', 'sit', 'amet'],
  };
  const actions = {
    openModal: jest.fn(),
  };

  setMockActions(actions);
  const wrapper = shallow(<SynonymCard {...MOCK_SYNONYM_SET} />)
    .find(EuiCard)
    .dive();

  it('renders with the first synonym as the title', () => {
    expect(wrapper.find('h2').text()).toEqual('lorem');
  });

  it('renders a synonym icon for each subsequent synonym', () => {
    expect(wrapper.find(SynonymIcon)).toHaveLength(4);
  });

  it('renders a manage synonym button', () => {
    wrapper.find(EuiButton).simulate('click');
    expect(actions.openModal).toHaveBeenCalledWith(MOCK_SYNONYM_SET);
  });
});
