/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea_logic';
import '../../../../__mocks__/react_router';
import '../../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow } from 'enzyme';
import { set } from 'lodash/fp';

import { CurationsTable, EmptyState } from '../components';

import { SuggestionsTable } from '../components/suggestions_table';

import { CurationsOverview } from './curations_overview';

const MOCK_VALUES = {
  // CurationsSettingsLogic
  curationsSettings: {
    enabled: true,
  },
  // CurationsLogic
  curations: [
    {
      id: 'cur-id-1',
    },
    {
      id: 'cur-id-2',
    },
  ],
  // EngineLogic
  engine: {
    adaptive_relevance_suggestions_active: true,
  },
};

describe('CurationsOverview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(MOCK_VALUES);
  });

  it('renders an empty message when there are no curations', () => {
    setMockValues({ ...MOCK_VALUES, curations: [] });
    const wrapper = shallow(<CurationsOverview />);

    expect(wrapper.find(EmptyState).exists()).toBe(true);
  });

  it('renders a curations table when there are curations present', () => {
    setMockValues({
      ...MOCK_VALUES,
      curations: [
        {
          id: 'cur-id-1',
        },
        {
          id: 'cur-id-2',
        },
      ],
    });
    const wrapper = shallow(<CurationsOverview />);

    expect(wrapper.find(CurationsTable)).toHaveLength(1);
  });

  it('renders a suggestions table when suggestions are active', () => {
    setMockValues(set('engine.adaptive_relevance_suggestions_active', true, MOCK_VALUES));
    const wrapper = shallow(<CurationsOverview />);

    expect(wrapper.find(SuggestionsTable).exists()).toBe(true);
  });

  it('doesn\t render a suggestions table when suggestions are not active', () => {
    setMockValues(set('engine.adaptive_relevance_suggestions_active', false, MOCK_VALUES));
    const wrapper = shallow(<CurationsOverview />);

    expect(wrapper.find(SuggestionsTable).exists()).toBe(false);
  });
});
