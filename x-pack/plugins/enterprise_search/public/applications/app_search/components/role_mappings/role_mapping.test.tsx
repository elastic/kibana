/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/shallow_useeffect.mock';
import { DEFAULT_INITIAL_APP_DATA } from '../../../../../common/__mocks__';
import { setMockActions, setMockValues } from '../../../__mocks__';
import { engines } from '../../__mocks__/engines.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCheckbox } from '@elastic/eui';

import { AttributeSelector, RoleSelector } from '../../../shared/role_mapping';
import { asRoleMapping } from '../../../shared/role_mapping/__mocks__/roles';

import { STANDARD_ROLE_TYPES } from './constants';

import { RoleMapping } from './role_mapping';

describe('RoleMapping', () => {
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
    handleAuthProviderChange: jest.fn(),
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
    availableAuthProviders: [],
    multipleAuthProvidersConfig: true,
    selectedAuthProviders: [],
    myRole: {
      availableRoleTypes: mockRole.ability.availableRoleTypes,
    },
  };

  beforeEach(() => {
    setMockActions(actions);
    setMockValues(mockValues);
  });

  it('renders', () => {
    setMockValues({ ...mockValues, roleMapping: asRoleMapping });
    const wrapper = shallow(<RoleMapping />);

    expect(wrapper.find(AttributeSelector)).toHaveLength(1);
    expect(wrapper.find(RoleSelector)).toHaveLength(1);
  });

  it('only passes standard role options for non-advanced roles', () => {
    setMockValues({ ...mockValues, hasAdvancedRoles: false });
    const wrapper = shallow(<RoleMapping />);

    expect(wrapper.find(RoleSelector).prop('roleOptions')).toHaveLength(STANDARD_ROLE_TYPES.length);
  });

  it('handles engine checkbox click', () => {
    const wrapper = shallow(<RoleMapping />);
    wrapper
      .find(EuiCheckbox)
      .first()
      .simulate('change', { target: { checked: true } });

    expect(actions.handleEngineSelectionChange).toHaveBeenCalledWith(engines[0].name, true);
  });
});
