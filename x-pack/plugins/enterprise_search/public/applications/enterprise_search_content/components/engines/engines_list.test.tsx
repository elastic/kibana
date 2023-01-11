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

import { EnginesListTable } from './components/tables/engines_table';
import { EnginesList } from './engines_list';
import { DEFAULT_META } from './types';

const DEFAULT_VALUES = {
  data: undefined,
  results: [],
  meta: DEFAULT_META,
  parameters: { meta: DEFAULT_META },
  status: Status.IDLE,
};
const mockValues = { ...DEFAULT_VALUES };

const mockActions = {
  fetchEngines: jest.fn(),
  onPaginate: jest.fn(),
};

describe('EnginesList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.localStorage.clear();
  });
  describe('Empty state', () => {});

  it('renders with Engines data ', async () => {
    setMockValues(mockValues);
    setMockActions(mockActions);

    const wrapper = shallow(<EnginesList />);

    expect(wrapper.find(EnginesListTable)).toHaveLength(1);
  });
});
