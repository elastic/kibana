/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import '../../../__mocks__/shallow_useeffect.mock';
import { setMockActions } from '../../../__mocks__/kea.mock';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { RelevanceTuning } from './relevance_tuning';
import { RelevanceTuningForm } from './relevance_tuning_form';

describe('RelevanceTuning', () => {
  let wrapper: ShallowWrapper;

  const actions = {
    initializeRelevanceTuning: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions(actions);
    wrapper = shallow(<RelevanceTuning engineBreadcrumb={['test']} />);
  });

  it('renders', () => {
    expect(wrapper.find(RelevanceTuningForm).exists()).toBe(true);
  });

  it('initializes relevance tuning data', () => {
    expect(actions.initializeRelevanceTuning).toHaveBeenCalled();
  });
});
