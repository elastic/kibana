/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/react_router';
import '../../../__mocks__/shallow_useeffect.mock';
import { DEFAULT_INITIAL_APP_DATA } from '../../../../../common/__mocks__';
import { setMockActions, setMockValues } from '../../../__mocks__/kea_logic';
import { engines } from '../../__mocks__/engines.mock';

import React from 'react';

import { waitFor } from '@testing-library/dom';
import { shallow } from 'enzyme';

import { EuiComboBox, EuiComboBoxOptionOption, EuiRadioGroup } from '@elastic/eui';

import { asRoleMapping } from '../../../shared/role_mapping/__mocks__/roles';

import { EngineAssignmentSelector } from './engine_assignment_selector';

describe('EngineAssignmentSelector', () => {
  const mockRole = DEFAULT_INITIAL_APP_DATA.appSearch.role;
  const actions = {
    initializeRoleMappings: jest.fn(),
    initializeRoleMapping: jest.fn(),
    handleSaveMapping: jest.fn(),
    handleEngineSelectionChange: jest.fn(),
    handleAccessAllEnginesChange: jest.fn(),
    handleAttributeValueChange: jest.fn(),
    handleAttributeSelectorChange: jest.fn(),
    handleDeleteMapping: jest.fn(),
    handleRoleChange: jest.fn(),
    resetState: jest.fn(),
  };

  const mockValues = {
    attributes: [],
    elasticsearchRoles: [],
    hasAdvancedRoles: true,
    dataLoading: false,
    roleType: 'admin',
    roleMappings: [asRoleMapping],
    attributeValue: '',
    attributeName: 'username',
    availableEngines: engines,
    selectedEngines: new Set(),
    accessAllEngines: false,
    myRole: {
      availableRoleTypes: mockRole.ability.availableRoleTypes,
    },
    roleMappingErrors: [],
  };

  beforeEach(() => {
    setMockActions(actions);
    setMockValues(mockValues);
  });

  it('renders', () => {
    setMockValues({ ...mockValues, roleMapping: asRoleMapping });
    const wrapper = shallow(<EngineAssignmentSelector />);

    expect(wrapper.find(EuiRadioGroup)).toHaveLength(1);
    expect(wrapper.find(EuiComboBox)).toHaveLength(1);
  });

  it('sets initial selected state when accessAllEngines is true', () => {
    setMockValues({ ...mockValues, accessAllEngines: true });
    const wrapper = shallow(<EngineAssignmentSelector />);

    expect(wrapper.find(EuiRadioGroup).prop('idSelected')).toBe('all');
  });

  it('handles all/specific engines radio change', () => {
    const wrapper = shallow(<EngineAssignmentSelector />);
    const radio = wrapper.find(EuiRadioGroup);
    radio.simulate('change', { target: { checked: false } });

    expect(actions.handleAccessAllEnginesChange).toHaveBeenCalledWith(false);
  });

  it('handles engine checkbox click', async () => {
    const wrapper = shallow(<EngineAssignmentSelector />);
    await waitFor(() =>
      (
        wrapper.find(EuiComboBox).props() as unknown as {
          onChange: (a: EuiComboBoxOptionOption[]) => void;
        }
      ).onChange([{ label: engines[0].name, value: engines[0].name }])
    );
    wrapper.update();

    expect(actions.handleEngineSelectionChange).toHaveBeenCalledWith([engines[0].name]);
  });
});
