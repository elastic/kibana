/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiInMemoryTable, EuiButtonIcon } from '@elastic/eui';

import { mountWithIntl } from '../../../../test_helpers';

import { SourceEnginesTable } from './source_engines_table';

describe('SourceEnginesTable', () => {
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

  beforeEach(() => {
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

  describe('actions column', () => {
    it('clicking a remove engine link calls a confirm dialogue before remove the engine', () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValueOnce(true);
      const wrapper = mountWithIntl(<SourceEnginesTable />);

      wrapper.find(EuiButtonIcon).simulate('click');

      expect(confirmSpy).toHaveBeenCalled();
      expect(MOCK_ACTIONS.removeSourceEngine).toHaveBeenCalled();
    });

    it('does not remove an engine if the user cancels the confirmation dialog', () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValueOnce(false);
      const wrapper = mountWithIntl(<SourceEnginesTable />);

      wrapper.find(EuiButtonIcon).simulate('click');

      expect(confirmSpy).toHaveBeenCalled();
      expect(MOCK_ACTIONS.removeSourceEngine).not.toHaveBeenCalled();
    });

    it('does not render the actions column if the user does not have permission to manage the engine', () => {
      setMockValues({
        ...MOCK_VALUES,
        myRole: { canManageMetaEngineSourceEngines: false },
      });
      const wrapper = mountWithIntl(<SourceEnginesTable />);

      expect(wrapper.find(EuiButtonIcon)).toHaveLength(0);
    });
  });
});
