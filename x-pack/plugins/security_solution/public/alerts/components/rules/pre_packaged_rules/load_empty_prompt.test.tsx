/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { PrePackagedRulesPrompt } from './load_empty_prompt';

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');

  return {
    ...original,
    useHistory: () => ({
      useHistory: jest.fn(),
    }),
  };
});

jest.mock('../../../../common/components/link_to');

describe('PrePackagedRulesPrompt', () => {
  it('renders correctly', () => {
    const wrapper = shallow(
      <PrePackagedRulesPrompt
        createPrePackagedRules={jest.fn()}
        loading={false}
        userHasNoPermissions={false}
      />
    );

    expect(wrapper.find('EmptyPrompt')).toHaveLength(1);
  });
});
