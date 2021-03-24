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

import { Loading } from '../../../shared/loading';
import {
  AttributeSelector,
  DeleteMappingCallout,
  RoleSelector,
} from '../../../shared/role_mapping';
import { asRoleMapping } from '../../../shared/role_mapping/__mocks__/roles';

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
    const wrapper = shallow(<RoleMapping />);

    expect(wrapper.find(AttributeSelector)).toHaveLength(1);
    expect(wrapper.find(RoleSelector)).toHaveLength(5);
  });

  it('returns Loading when loading', () => {
    setMockValues({ ...mockValues, dataLoading: true });
    const wrapper = shallow(<RoleMapping />);

    expect(wrapper.find(Loading)).toHaveLength(1);
  });

  it('renders DeleteMappingCallout for existing mapping', () => {
    setMockValues({ ...mockValues, roleMapping: asRoleMapping });
    const wrapper = shallow(<RoleMapping />);

    expect(wrapper.find(DeleteMappingCallout)).toHaveLength(1);
  });

  it('hides DeleteMappingCallout for new mapping', () => {
    const wrapper = shallow(<RoleMapping isNew />);

    expect(wrapper.find(DeleteMappingCallout)).toHaveLength(0);
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
