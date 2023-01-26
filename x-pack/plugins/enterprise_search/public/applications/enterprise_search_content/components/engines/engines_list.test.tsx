/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { Status } from '../../../../../common/types/api';

import { EnterpriseSearchEnginesPageTemplate } from '../layout/engines_page_template';

import { EmptyEnginesPrompt } from './components/empty_engines_prompt';
import { EnginesListTable } from './components/tables/engines_table';
import { EnginesList } from './engines_list';
import { DEFAULT_META } from './types';

const DEFAULT_VALUES = {
  data: undefined,
  isLoading: true,
  meta: DEFAULT_META,
  parameters: { meta: DEFAULT_META },
  results: [],
  status: Status.IDLE,
};
const mockValues = {
  ...DEFAULT_VALUES,
  isLoading: false,
  results: [
    {
      created: '1999-12-31T23:59:59Z',
      indices: ['index-18', 'index-23'],
      name: 'engine-name-1',
      updated: '1999-12-31T23:59:59Z',
    },
  ],
  status: Status.SUCCESS,
};

const mockActions = {
  fetchEngines: jest.fn(),
  onPaginate: jest.fn(),
};

describe('EnginesList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.localStorage.clear();
  });
  it('renders loading when isLoading', () => {
    setMockValues(DEFAULT_VALUES);
    setMockActions(mockActions);

    const wrapper = shallow(<EnginesList />);
    const pageTemplate = wrapper.find(EnterpriseSearchEnginesPageTemplate);

    expect(pageTemplate.prop('isLoading')).toEqual(true);
  });
  it('renders empty prompt when no data is available', () => {
    setMockValues(DEFAULT_VALUES);
    setMockActions(mockActions);
    const wrapper = shallow(<EnginesList />);

    expect(wrapper.find(EmptyEnginesPrompt)).toHaveLength(1);
    expect(wrapper.find(EnginesListTable)).toHaveLength(0);
  });

  it('renders with Engines data ', async () => {
    setMockValues(mockValues);
    setMockActions(mockActions);

    const wrapper = shallow(<EnginesList />);

    expect(wrapper.find(EnginesListTable)).toHaveLength(1);
    expect(wrapper.find(EmptyEnginesPrompt)).toHaveLength(0);
  });
});
