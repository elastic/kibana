/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/react_router';
import '../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { AttributeSelector, RoleSelector, RoleMappingFlyout } from '../../../shared/role_mapping';
import { wsRoleMapping } from '../../../shared/role_mapping/__mocks__/roles';

import { GroupAssignmentSelector } from './group_assignment_selector';
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
    roleMappingErrors: [],
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
      resetState,
    });
    setMockValues(mockValues);
  });

  it('renders', () => {
    setMockValues({ ...mockValues, roleMapping: wsRoleMapping });
    const wrapper = shallow(<RoleMapping />);

    expect(wrapper.find(AttributeSelector)).toHaveLength(1);
    expect(wrapper.find(RoleSelector)).toHaveLength(1);
    expect(wrapper.find(GroupAssignmentSelector)).toHaveLength(1);
  });

  it('enables flyout when attribute value is valid', () => {
    setMockValues({
      ...mockValues,
      attributeValue: 'foo',
      attributeName: 'role',
      includeInAllGroups: true,
    });
    const wrapper = shallow(<RoleMapping />);

    expect(wrapper.find(RoleMappingFlyout).prop('disabled')).toBe(false);
  });
});
