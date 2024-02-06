/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { AIPlayground } from './ai_playground';
import { AIPlaygroundSidebar } from './components/ai_playground_sidebar';
import { EmptyIndex } from './components/empty_index';

describe('AI Playground', () => {
  describe('Empty state', () => {
    it('renders when Indices are empty', () => {
      setMockValues({
        hasNoIndices: true,
      });

      const wrapper = shallow(<AIPlayground />);

      expect(wrapper.find(EmptyIndex)).toHaveLength(1);
    });
  });

  it('renders when indices are available', () => {
    setMockValues({
      hasNoIndices: false,
    });

    const wrapper = shallow(<AIPlayground />);

    expect(wrapper.find(EmptyIndex)).toHaveLength(0);
    expect(wrapper.find(AIPlaygroundSidebar)).toHaveLength(1);
  });
});
