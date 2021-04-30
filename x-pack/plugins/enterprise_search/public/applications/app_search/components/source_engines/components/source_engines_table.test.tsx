/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mountWithIntl, setMockActions, setMockValues } from '../../../../__mocks__';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiBasicTable, EuiButtonEmpty, EuiInMemoryTable } from '@elastic/eui';

import { SourceEnginesTable } from './source_engines_table';

const MOCK_VALUES = {
  // AppLogic
  myRole: {
    canManageMetaEngineSourceEngines: true,
  },
  // SourceEnginesLogic
  sourceEngines: [{ name: 'source-engine-1', document_count: 15, field_count: 26 }],
};

const MOCK_ACTIONS = {
  removeSourceEngine: jest.fn(),
};

describe('SourceEnginesTable', () => {
  beforeAll(() => {
    jest.clearAllMocks();
    setMockActions(MOCK_ACTIONS);
    setMockValues(MOCK_VALUES);
  });

  it('renders', () => {
    const wrapper = shallow(<SourceEnginesTable />);

    expect(wrapper.find(EuiInMemoryTable)).toHaveLength(1);
  });

  it('contains relevant informatiom from source engines', () => {
    const wrapper = mountWithIntl(<SourceEnginesTable />);

    expect(wrapper.find(EuiInMemoryTable).text()).toContain('source-engine-1');
    expect(wrapper.find(EuiInMemoryTable).text()).toContain('15');
    expect(wrapper.find(EuiInMemoryTable).text()).toContain('26');
  });

  it.skip('clicking a remove engine link calls a confirm dialogue before remove the engine', () => {
    const confirmSpy = jest.spyOn(window, 'confirm');
    confirmSpy.mockReturnValueOnce(true);
    const wrapper = shallow(<SourceEnginesTable />);

    // TODO I can't figure out how to find this EuiButtonEmpty ????
    // Fixing this test will fix coverage
    const table = wrapper.find(EuiInMemoryTable).dive().find(EuiBasicTable).dive();
    table.find(EuiButtonEmpty).simulate('click');

    expect(confirmSpy).toHaveBeenCalled();
    expect(MOCK_ACTIONS.removeSourceEngine);
  });
});
