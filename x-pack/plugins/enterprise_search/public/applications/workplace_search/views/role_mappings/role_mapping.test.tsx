/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../__mocks__';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCheckbox } from '@elastic/eui';

import { Loading } from '../../../shared/loading';
import { AttributeSelector, RoleSelector } from '../../../shared/role_mapping';
import { wsRoleMapping } from '../../../shared/role_mapping/__mocks__/roles';
import {
  SAVE_ROLE_MAPPING,
  UPDATE_ROLE_MAPPING,
  ADD_ROLE_MAPPING_TITLE,
  MANAGE_ROLE_MAPPING_TITLE,
} from '../../../shared/role_mapping/constants';
import { ViewContentHeader } from '../../components/shared/view_content_header';

import { RoleMapping } from './role_mapping';

describe('RoleMapping', () => {
  const initializeRoleMappings = jest.fn();
  const initializeRoleMapping = jest.fn();
  const handleSaveMapping = jest.fn();
  const handleGroupSelectionChange = jest.fn();
  const handleAllGroupsSelectionChange = jest.fn();
  const handleAttributeValueChange = jest.fn();
  const handleAttributeSelectorChange = jest.fn();
  const handleDeleteMapping = jest.fn();
  const handleRoleChange = jest.fn();
  const handleAuthProviderChange = jest.fn();
  const resetState = jest.fn();
  const groups = [
    {
      name: 'Group 1',
      id: 'g1',
    },
    {
      name: 'Group 2',
      id: 'g2',
    },
  ];
  const mockValues = {
    attributes: [],
    elasticsearchRoles: [],
    dataLoading: false,
    roleType: 'admin',
    roleMappings: [wsRoleMapping],
    attributeValue: '',
    attributeName: 'username',
    availableGroups: groups,
    selectedGroups: new Set(),
    includeInAllGroups: false,
    availableAuthProviders: [],
    multipleAuthProvidersConfig: true,
    selectedAuthProviders: [],
  };

  beforeEach(() => {
    setMockActions({
      initializeRoleMappings,
      initializeRoleMapping,
      handleSaveMapping,
      handleGroupSelectionChange,
      handleAllGroupsSelectionChange,
      handleAttributeValueChange,
      handleAttributeSelectorChange,
      handleDeleteMapping,
      handleRoleChange,
      handleAuthProviderChange,
      resetState,
    });
    setMockValues(mockValues);
  });

  it('renders for existing role mapping', () => {
    setMockValues({ ...mockValues, roleMapping: wsRoleMapping });
    const wrapper = shallow(<RoleMapping />);
    const header = wrapper.find(ViewContentHeader);

    expect(wrapper.find(AttributeSelector)).toHaveLength(1);
    expect(wrapper.find(RoleSelector)).toHaveLength(1);
    expect(wrapper.find(ViewContentHeader).prop('title')).toEqual(MANAGE_ROLE_MAPPING_TITLE);
    expect(shallow(header.prop('action') as any).text()).toEqual(UPDATE_ROLE_MAPPING);
  });

  it('renders for new role mapping', () => {
    const wrapper = shallow(<RoleMapping />);
    const header = wrapper.find(ViewContentHeader);

    expect(header.prop('title')).toEqual(ADD_ROLE_MAPPING_TITLE);
    expect(shallow(header.prop('action') as any).text()).toEqual(SAVE_ROLE_MAPPING);
  });

  it('returns Loading when loading', () => {
    setMockValues({ ...mockValues, dataLoading: true });
    const wrapper = shallow(<RoleMapping />);

    expect(wrapper.find(Loading)).toHaveLength(1);
  });

  it('handles group checkbox click', () => {
    const wrapper = shallow(<RoleMapping />);
    wrapper
      .find(EuiCheckbox)
      .first()
      .simulate('change', { target: { checked: true } });

    expect(handleGroupSelectionChange).toHaveBeenCalledWith(groups[0].id, true);
  });

  it('handles all groups checkbox click', () => {
    const wrapper = shallow(<RoleMapping />);
    wrapper
      .find(EuiCheckbox)
      .last()
      .simulate('change', { target: { checked: true } });

    expect(handleAllGroupsSelectionChange).toHaveBeenCalledWith(true);
  });
});
