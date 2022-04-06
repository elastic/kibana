/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { RulesPage } from './index';
import { RulesTable } from './components/rules_table';
import { RuleState } from './types';
import { kibanaStartMock } from '../../utils/kibana_react.mock';

const mockUseKibanaReturnValue = kibanaStartMock.startContract();

jest.mock('../../utils/kibana_react', () => ({
  __esModule: true,
  useKibana: jest.fn(() => mockUseKibanaReturnValue),
}));

jest.mock('../../hooks/use_breadcrumbs', () => ({
  useBreadcrumbs: jest.fn(),
}));

jest.mock('./config', () => ({
  hasExecuteActionsCapability: jest.fn(() => true),
  convertRulesToTableItems: jest.fn(),
}));

jest.mock('../../hooks/use_fetch_rules', () => ({
  useFetchRules: jest.fn(),
}));

// const { useFetchRules } = jest.requireMock('../../hooks/use_fetch_rules');

describe('empty RulesPage', () => {
  async function setup() {
    const { useFetchRules } = jest.requireMock('../../hooks/use_fetch_rules');
    const rulesState: RuleState = {
      isLoading: false,
      data: [],
      error: null,
      totalItemCount: 0,
    };
    useFetchRules.mockReturnValue({ rulesState, noData: true });
  }
  it('renders empty screen', async () => {
    await setup();

    const wrapper = shallow(<RulesPage />);

    expect(wrapper.find(RulesTable)).toHaveLength(0);
  });
});

describe('empty RulesPage with show only capability', () => {});

describe('rulesPage with items', () => {});

describe('rulesPage with items and show only capability', () => {});

describe('rulesPage with disabled items', () => {});
