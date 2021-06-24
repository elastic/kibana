/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/react_router';
import '../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../__mocks__/kea_logic';
import { groups } from '../../__mocks__/groups.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { UserFlyout, UserAddedInfo, UserInvitationCallout } from '../../../shared/role_mapping';
import { elasticsearchUsers } from '../../../shared/role_mapping/__mocks__/elasticsearch_users';
import { wsSingleUserRoleMapping } from '../../../shared/role_mapping/__mocks__/roles';

import { GroupAssignmentSelector } from './group_assignment_selector';
import { User } from './user';

describe('User', () => {
  const handleSaveUser = jest.fn();
  const closeUsersAndRolesFlyout = jest.fn();
  const setUserExistingRadioValue = jest.fn();
  const setElasticsearchUsernameValue = jest.fn();
  const setElasticsearchEmailValue = jest.fn();
  const handleRoleChange = jest.fn();
  const handleUsernameSelectChange = jest.fn();

  const mockValues = {
    availableGroups: [],
    singleUserRoleMapping: null,
    userFormUserIsExisting: false,
    elasticsearchUsers: [],
    elasticsearchUser: {},
    roleType: 'admin',
    roleMappingErrors: [],
    userCreated: false,
    userFormIsNewUser: false,
  };

  beforeEach(() => {
    setMockActions({
      handleSaveUser,
      closeUsersAndRolesFlyout,
      setUserExistingRadioValue,
      setElasticsearchUsernameValue,
      setElasticsearchEmailValue,
      handleRoleChange,
      handleUsernameSelectChange,
    });

    setMockValues(mockValues);
  });

  it('renders', () => {
    const wrapper = shallow(<User />);

    expect(wrapper.find(UserFlyout)).toHaveLength(1);
  });

  it('renders group assignment selector when groups present', () => {
    setMockValues({ ...mockValues, availableGroups: groups });
    const wrapper = shallow(<User />);

    expect(wrapper.find(GroupAssignmentSelector)).toHaveLength(1);
  });

  it('renders userInvitationCallout', () => {
    setMockValues({
      ...mockValues,
      singleUserRoleMapping: wsSingleUserRoleMapping,
    });
    const wrapper = shallow(<User />);

    expect(wrapper.find(UserInvitationCallout)).toHaveLength(1);
  });

  it('renders user added info when user created', () => {
    setMockValues({
      ...mockValues,
      singleUserRoleMapping: wsSingleUserRoleMapping,
      userCreated: true,
    });
    const wrapper = shallow(<User />);

    expect(wrapper.find(UserAddedInfo)).toHaveLength(1);
  });

  it('disables form when username value not present', () => {
    setMockValues({
      ...mockValues,
      singleUserRoleMapping: wsSingleUserRoleMapping,
      elasticsearchUsers,
      elasticsearchUser: {
        username: null,
        email: 'email@user.com',
      },
    });
    const wrapper = shallow(<User />);

    expect(wrapper.find(UserFlyout).prop('disabled')).toEqual(true);
  });

  it('enables form when userFormUserIsExisting', () => {
    setMockValues({
      ...mockValues,
      userFormUserIsExisting: true.valueOf,
      singleUserRoleMapping: wsSingleUserRoleMapping,
      elasticsearchUsers,
      elasticsearchUser: {
        username: null,
        email: 'email@user.com',
      },
    });
    const wrapper = shallow(<User />);

    expect(wrapper.find(UserFlyout).prop('disabled')).toEqual(false);
  });
});
