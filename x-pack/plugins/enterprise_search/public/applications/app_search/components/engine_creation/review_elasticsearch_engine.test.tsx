/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/react_router';
import '../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { ReviewElasticsearchEngine } from './review_elasticsearch_engine';

describe('ReviewElasticsearchEngine', () => {
  const DEFAULT_VALUES = {
    aliasName: '',
  };

  const MOCK_ACTIONS = {
    submitEngine: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(DEFAULT_VALUES);
    setMockActions(MOCK_ACTIONS);
  });

  it('renders', () => {
    const wrapper = shallow(<ReviewElasticsearchEngine />);
    expect(wrapper.find('[data-test-subj="ElasticsearchEngineCreationForm"]')).toHaveLength(1);
  });

  it('ElasticsearchEngineCreationForm calls submitEngine on form submit', () => {
    const wrapper = shallow(<ReviewElasticsearchEngine />);
    const simulatedEvent = {
      preventDefault: jest.fn(),
    };
    wrapper
      .find('[data-test-subj="ElasticsearchEngineCreationForm"]')
      .simulate('submit', simulatedEvent);

    expect(MOCK_ACTIONS.submitEngine).toHaveBeenCalledTimes(1);
  });

  it('ElasticsearchEngineCreationFormAliasNameCallout is present if aliasName is present', () => {
    setMockValues({ ...DEFAULT_VALUES, aliasName: 'i-exist' });

    const wrapper = shallow(<ReviewElasticsearchEngine />);
    expect(
      wrapper.find('[data-test-subj="ElasticsearchEngineCreationFormAliasNameCallout"]')
    ).toHaveLength(1);
  });

  it('ElasticsearchEngineCreationFormAliasNameCallout is not present if aliasName is not present', () => {
    setMockValues({ ...DEFAULT_VALUES, aliasName: '' });

    const wrapper = shallow(<ReviewElasticsearchEngine />);
    expect(
      wrapper.find('[data-test-subj="ElasticsearchEngineCreationFormAliasNameCallout"]')
    ).toHaveLength(0);
  });
});
