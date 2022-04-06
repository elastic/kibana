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
import { kibanaStartMock } from '../../utils/kibana_react.mock';

const mockUseKibanaReturnValue = kibanaStartMock.startContract();

jest.mock('../../utils/kibana_react', () => ({
  __esModule: true,
  useKibana: jest.fn(() => mockUseKibanaReturnValue),
}));

jest.mock('./config', () => ({
  hasExecuteActionsCapability: jest.fn(() => true),
}));

describe('RulesPage', () => {
  async function setup() {}
  it('renders empty screen', async () => {
    await setup();
    const wrapper = shallow(<RulesPage />);

    expect(wrapper.find('[title="Rules"]')).toBeTruthy();
    expect(wrapper.find(RulesTable)).toHaveLength(1);
  });
});
