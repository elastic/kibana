/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/shallow_useeffect.mock';
import { setMockValues, setMockActions } from '../../../__mocks__/kea_logic';
import { indices, searchEngines } from '../../__mocks__';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiBasicTable } from '@elastic/eui';

import { AddContentEmptyPrompt } from '../../../shared/add_content_empty_prompt';
import { ElasticsearchResources } from '../../../shared/elasticsearch_resources';
import { GettingStartedSteps } from '../../../shared/getting_started_steps';

import { Indices } from './indices';

const mockActions = {
  initPage: jest.fn(),
};

describe('Indices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('Empty state', () => {
    it('renders when both Search Indices and Search Engines empty', () => {
      setMockValues({
        indices: [],
        searchEngines: [],
      });
      setMockActions(mockActions);
      const wrapper = shallow(<Indices />);

      expect(wrapper.find(AddContentEmptyPrompt)).toHaveLength(1);
      expect(wrapper.find(EuiBasicTable)).toHaveLength(0);

      expect(wrapper.find(GettingStartedSteps)).toHaveLength(1);
      expect(wrapper.find(ElasticsearchResources)).toHaveLength(1);
    });

    it('renders complete empty state when only Search Indices empty', () => {
      setMockValues({
        indices: [],
        searchEngines,
      });
      setMockActions(mockActions);
      const wrapper = shallow(<Indices />);

      expect(wrapper.find(AddContentEmptyPrompt)).toHaveLength(1);
      expect(wrapper.find(EuiBasicTable)).toHaveLength(0);

      expect(wrapper.find(GettingStartedSteps)).toHaveLength(1);
      expect(wrapper.find(ElasticsearchResources)).toHaveLength(1);
    });

    it('renders when only Search Engines empty', () => {
      setMockValues({
        indices,
        searchEngines: [],
      });
      setMockActions(mockActions);
      const wrapper = shallow(<Indices />);

      expect(wrapper.find(AddContentEmptyPrompt)).toHaveLength(0);
      expect(wrapper.find(EuiBasicTable)).toHaveLength(1);

      expect(wrapper.find(GettingStartedSteps)).toHaveLength(1);
      expect(wrapper.find(ElasticsearchResources)).toHaveLength(1);
    });
  });

  it('renders with Data', () => {
    setMockValues({
      indices,
      searchEngines,
    });
    setMockActions(mockActions);

    const wrapper = shallow(<Indices />);

    expect(wrapper.find(AddContentEmptyPrompt)).toHaveLength(0);
    expect(wrapper.find(EuiBasicTable)).toHaveLength(1);

    expect(wrapper.find(GettingStartedSteps)).toHaveLength(0);
    expect(wrapper.find(ElasticsearchResources)).toHaveLength(0);

    expect(mockActions.initPage).toHaveBeenCalledTimes(1);
  });
});
