/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/shallow_useeffect.mock';
import { setMockValues, setMockActions } from '../../../__mocks__/kea_logic';

import { indices } from '../../__mocks__/search_indices.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCallOut, EuiButton } from '@elastic/eui';

import { AddContentEmptyPrompt } from '../../../shared/add_content_empty_prompt';
import { DEFAULT_META } from '../../../shared/constants';
import { ElasticsearchResources } from '../../../shared/elasticsearch_resources';
import { GettingStartedSteps } from '../../../shared/getting_started_steps';

import { IndicesTable } from './indices_table';

import { SearchIndices } from './search_indices';

const mockValues = {
  indices,
  meta: DEFAULT_META,
};

const mockActions = {
  fetchIndices: jest.fn(),
  onPaginate: jest.fn(),
  setIsFirstRequest: jest.fn(),
};

describe('SearchIndices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.localStorage.clear();
  });
  describe('Empty state', () => {
    it('renders when Indices are empty on initial query', () => {
      setMockValues({
        ...mockValues,
        hasNoIndices: true,
        indices: [],
      });
      setMockActions(mockActions);
      const wrapper = shallow(<SearchIndices />);

      expect(wrapper.find(AddContentEmptyPrompt)).toHaveLength(1);
      expect(wrapper.find(IndicesTable)).toHaveLength(0);

      expect(wrapper.find(GettingStartedSteps)).toHaveLength(1);
      expect(wrapper.find(ElasticsearchResources)).toHaveLength(1);
      expect(mockActions.setIsFirstRequest).toHaveBeenCalled();
    });
  });

  it('renders with Data', async () => {
    setMockValues(mockValues);
    setMockActions(mockActions);

    const wrapper = shallow(<SearchIndices />);

    expect(wrapper.find(AddContentEmptyPrompt)).toHaveLength(0);
    expect(wrapper.find(IndicesTable)).toHaveLength(1);

    expect(wrapper.find(GettingStartedSteps)).toHaveLength(0);
    expect(wrapper.find(ElasticsearchResources)).toHaveLength(0);

    expect(mockActions.fetchIndices).toHaveBeenCalled();
    expect(wrapper.find(EuiCallOut)).toHaveLength(1);
  });

  it('dismisses callout on click to button', () => {
    setMockValues(mockValues);
    setMockActions(mockActions);

    const wrapper = shallow(<SearchIndices />);
    const dismissButton = wrapper.find(EuiCallOut).find(EuiButton);
    expect(global.localStorage.getItem('enterprise-search-indices-callout-dismissed')).toBe(
      'false'
    );
    dismissButton.simulate('click');
    expect(global.localStorage.getItem('enterprise-search-indices-callout-dismissed')).toBe('true');
  });

  // Move this test to the indices table when writing tests there

  // it('sets table pagination correctly', () => {
  //   setMockValues(mockValues);
  //   setMockActions(mockActions);

  //   const wrapper = shallow(<SearchIndices />);
  //   const table = wrapper.find(IndicesTable);

  //   expect(table.prop('pagination')).toEqual({
  //     pageIndex: 0,
  //     pageSize: 10,
  //     showPerPageOptions: false,
  //     totalItemCount: 0,
  //   });

  //   table.simulate('change', { page: { index: 2 } });
  //   expect(mockActions.onPaginate).toHaveBeenCalledTimes(1);
  //   expect(mockActions.onPaginate).toHaveBeenCalledWith(3); // API's are 1 indexed, but table is 0 indexed
  // });
});
