/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogicMounter,
  mockFlashMessageHelpers,
  mockHttpValues,
} from '../../../__mocks__/kea_logic';

import { groups } from '../../__mocks__/groups.mock';

import { nextTick } from '@kbn/test-jest-helpers';

import { elasticsearchUsers } from '../../../shared/role_mapping/__mocks__/elasticsearch_users';

import {
  wsRoleMapping,
  wsSingleUserRoleMapping,
} from '../../../shared/role_mapping/__mocks__/roles';

import { itShowsServerErrorAsFlashMessage } from '../../../test_helpers';

import { RoleMappingsLogic } from './role_mappings_logic';

const emptyUser = { username: '', email: '' };

describe('RoleMappingsLogic', () => {
  const { http } = mockHttpValues;
  const { clearFlashMessages, flashAPIErrors } = mockFlashMessageHelpers;
  const { mount } = new LogicMounter(RoleMappingsLogic);
  const defaultValues = {
    attributes: [],
    elasticsearchRoles: [],
    elasticsearchUser: emptyUser,
    elasticsearchUsers: [],
    roleMapping: null,
    roleMappingFlyoutOpen: false,
    roleMappings: [],
    roleType: 'admin',
    attributeValue: '',
    attributeName: 'username',
    dataLoading: true,
    availableGroups: [],
    selectedGroups: new Set(),
    includeInAllGroups: false,
    selectedOptions: [],
    roleMappingErrors: [],
    singleUserRoleMapping: null,
    singleUserRoleMappings: [],
    singleUserRoleMappingFlyoutOpen: false,
    userCreated: false,
    userFormIsNewUser: true,
    userFormUserIsExisting: true,
    smtpSettingsPresent: false,
    formLoading: false,
  };
  const roleGroup = {
    id: '123',
    name: 'Role Group',
  };
  const defaultGroup = {
    id: '124',
    name: 'Default',
  };

  const mappingsServerProps = {
    roleMappings: [wsRoleMapping],
    attributes: [],
    availableGroups: [roleGroup, defaultGroup],
    elasticsearchRoles: [],
    singleUserRoleMappings: [wsSingleUserRoleMapping],
    elasticsearchUsers,
    smtpSettingsPresent: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mount();
  });

  it('has expected default values', () => {
    expect(RoleMappingsLogic.values).toEqual(defaultValues);
  });

  describe('actions', () => {
    describe('setRoleMappingsData', () => {
      it('sets data based on server response from the `mappings` (plural) endpoint', () => {
        RoleMappingsLogic.actions.setRoleMappingsData(mappingsServerProps);

        expect(RoleMappingsLogic.values.roleMappings).toEqual([wsRoleMapping]);
        expect(RoleMappingsLogic.values.dataLoading).toEqual(false);
        expect(RoleMappingsLogic.values.dataLoading).toEqual(false);
        expect(RoleMappingsLogic.values.attributes).toEqual(mappingsServerProps.attributes);
        expect(RoleMappingsLogic.values.availableGroups).toEqual(
          mappingsServerProps.availableGroups
        );
        expect(RoleMappingsLogic.values.includeInAllGroups).toEqual(false);
        expect(RoleMappingsLogic.values.elasticsearchRoles).toEqual(
          mappingsServerProps.elasticsearchRoles
        );
        expect(RoleMappingsLogic.values.selectedOptions).toEqual([
          { label: defaultGroup.name, value: defaultGroup.id },
        ]);
        expect(RoleMappingsLogic.values.selectedGroups).toEqual(new Set([defaultGroup.id]));
      });

      it('handles fallback if no elasticsearch users present', () => {
        RoleMappingsLogic.actions.setRoleMappingsData({
          ...mappingsServerProps,
          elasticsearchUsers: [],
        });

        expect(RoleMappingsLogic.values.elasticsearchUser).toEqual(emptyUser);
      });
    });

    it('setRoleMappings', () => {
      RoleMappingsLogic.actions.setRoleMappings({ roleMappings: [wsRoleMapping] });

      expect(RoleMappingsLogic.values.roleMappings).toEqual([wsRoleMapping]);
      expect(RoleMappingsLogic.values.dataLoading).toEqual(false);
    });

    describe('setElasticsearchUser', () => {
      it('sets user', () => {
        RoleMappingsLogic.actions.setElasticsearchUser(elasticsearchUsers[0]);

        expect(RoleMappingsLogic.values.elasticsearchUser).toEqual(elasticsearchUsers[0]);
      });

      it('handles fallback if no user present', () => {
        RoleMappingsLogic.actions.setElasticsearchUser(undefined);

        expect(RoleMappingsLogic.values.elasticsearchUser).toEqual(emptyUser);
      });
    });

    it('setSingleUserRoleMapping', () => {
      RoleMappingsLogic.actions.setSingleUserRoleMapping(wsSingleUserRoleMapping);

      expect(RoleMappingsLogic.values.singleUserRoleMapping).toEqual(wsSingleUserRoleMapping);
    });

    it('handleRoleChange', () => {
      RoleMappingsLogic.actions.handleRoleChange('user');

      expect(RoleMappingsLogic.values.roleType).toEqual('user');
    });

    it('handleGroupSelectionChange', () => {
      const group = wsRoleMapping.groups[0];
      const otherGroup = groups[0];
      RoleMappingsLogic.actions.setRoleMappingsData({
        ...mappingsServerProps,
        roleMappings: [
          {
            ...wsRoleMapping,
            groups: [group, otherGroup],
          },
        ],
      });

      RoleMappingsLogic.actions.initializeRoleMapping(wsRoleMapping.id);
      RoleMappingsLogic.actions.handleGroupSelectionChange([group.id, otherGroup.id]);
      expect(RoleMappingsLogic.values.selectedGroups).toEqual(new Set([group.id, otherGroup.id]));
      expect(RoleMappingsLogic.values.selectedOptions).toEqual([
        { label: roleGroup.name, value: roleGroup.id },
      ]);

      RoleMappingsLogic.actions.handleGroupSelectionChange([group.id]);
      expect(RoleMappingsLogic.values.selectedGroups).toEqual(new Set([group.id]));
    });

    it('handleAllGroupsSelectionChange', () => {
      RoleMappingsLogic.actions.handleAllGroupsSelectionChange(true);

      expect(RoleMappingsLogic.values.includeInAllGroups).toEqual(true);
    });

    it('setUserExistingRadioValue', () => {
      RoleMappingsLogic.actions.setUserExistingRadioValue(false);

      expect(RoleMappingsLogic.values.userFormUserIsExisting).toEqual(false);
    });

    describe('handleAttributeSelectorChange', () => {
      const elasticsearchRoles = ['foo', 'bar'];

      it('sets values correctly', () => {
        RoleMappingsLogic.actions.setRoleMappingsData({
          ...mappingsServerProps,
          elasticsearchRoles,
        });
        RoleMappingsLogic.actions.handleAttributeSelectorChange('role', elasticsearchRoles[0]);

        expect(RoleMappingsLogic.values.attributeValue).toEqual(elasticsearchRoles[0]);
        expect(RoleMappingsLogic.values.attributeName).toEqual('role');
      });

      it('correctly handles "role" fallback', () => {
        RoleMappingsLogic.actions.handleAttributeSelectorChange('username', elasticsearchRoles[0]);

        expect(RoleMappingsLogic.values.attributeValue).toEqual('');
      });
    });

    it('handleAttributeValueChange', () => {
      RoleMappingsLogic.actions.handleAttributeValueChange('changed_value');

      expect(RoleMappingsLogic.values.attributeValue).toEqual('changed_value');
    });

    it('resetState', () => {
      RoleMappingsLogic.actions.setRoleMappingsData(mappingsServerProps);
      RoleMappingsLogic.actions.resetState();

      expect(RoleMappingsLogic.values.dataLoading).toEqual(true);
      expect(RoleMappingsLogic.values.roleMappings).toEqual([]);
      expect(RoleMappingsLogic.values.roleMapping).toEqual(null);
      expect(RoleMappingsLogic.values.attributeValue).toEqual('');
      expect(RoleMappingsLogic.values.attributeName).toEqual('username');
      expect(clearFlashMessages).toHaveBeenCalled();
    });

    it('openRoleMappingFlyout', () => {
      mount(mappingsServerProps);
      RoleMappingsLogic.actions.openRoleMappingFlyout();

      expect(RoleMappingsLogic.values.roleMappingFlyoutOpen).toEqual(true);
      expect(clearFlashMessages).toHaveBeenCalled();
    });

    it('openSingleUserRoleMappingFlyout', () => {
      mount(mappingsServerProps);
      RoleMappingsLogic.actions.openSingleUserRoleMappingFlyout();

      expect(RoleMappingsLogic.values.singleUserRoleMappingFlyoutOpen).toEqual(true);
      expect(clearFlashMessages).toHaveBeenCalled();
    });

    it('closeUsersAndRolesFlyout', () => {
      mount({
        ...mappingsServerProps,
        roleMappingFlyoutOpen: true,
      });
      RoleMappingsLogic.actions.closeUsersAndRolesFlyout();

      expect(RoleMappingsLogic.values.roleMappingFlyoutOpen).toEqual(false);
      expect(clearFlashMessages).toHaveBeenCalled();
    });

    it('setElasticsearchUsernameValue', () => {
      const username = 'newName';
      RoleMappingsLogic.actions.setElasticsearchUsernameValue(username);

      expect(RoleMappingsLogic.values.elasticsearchUser).toEqual({
        ...RoleMappingsLogic.values.elasticsearchUser,
        username,
      });
    });

    it('setElasticsearchEmailValue', () => {
      const email = 'newEmail@foo.cats';
      RoleMappingsLogic.actions.setElasticsearchEmailValue(email);

      expect(RoleMappingsLogic.values.elasticsearchUser).toEqual({
        ...RoleMappingsLogic.values.elasticsearchUser,
        email,
      });
    });

    it('setUserCreated', () => {
      RoleMappingsLogic.actions.setUserCreated();

      expect(RoleMappingsLogic.values.userCreated).toEqual(true);
    });
  });

  describe('listeners', () => {
    describe('enableRoleBasedAccess', () => {
      it('calls API and sets values', async () => {
        const setRoleMappingsSpy = jest.spyOn(RoleMappingsLogic.actions, 'setRoleMappings');
        http.post.mockReturnValue(Promise.resolve(mappingsServerProps));
        RoleMappingsLogic.actions.enableRoleBasedAccess();

        expect(RoleMappingsLogic.values.dataLoading).toEqual(true);

        expect(http.post).toHaveBeenCalledWith(
          '/internal/workplace_search/org/role_mappings/enable_role_based_access'
        );
        await nextTick();
        expect(setRoleMappingsSpy).toHaveBeenCalledWith(mappingsServerProps);
      });

      itShowsServerErrorAsFlashMessage(http.post, () => {
        RoleMappingsLogic.actions.enableRoleBasedAccess();
      });
    });

    describe('initializeRoleMappings', () => {
      it('calls API and sets values', async () => {
        const setRoleMappingsDataSpy = jest.spyOn(RoleMappingsLogic.actions, 'setRoleMappingsData');
        http.get.mockReturnValue(Promise.resolve(mappingsServerProps));
        RoleMappingsLogic.actions.initializeRoleMappings();

        expect(http.get).toHaveBeenCalledWith('/internal/workplace_search/org/role_mappings');
        await nextTick();
        expect(setRoleMappingsDataSpy).toHaveBeenCalledWith(mappingsServerProps);
      });

      itShowsServerErrorAsFlashMessage(http.get, () => {
        RoleMappingsLogic.actions.initializeRoleMappings();
      });

      it('resets roleMapping state', () => {
        mount({
          ...mappingsServerProps,
          roleMapping: wsRoleMapping,
        });
        RoleMappingsLogic.actions.initializeRoleMappings();

        expect(RoleMappingsLogic.values.roleMapping).toEqual(null);
      });
    });

    describe('initializeRoleMapping', () => {
      it('sets values for existing mapping', () => {
        const setRoleMappingDataSpy = jest.spyOn(RoleMappingsLogic.actions, 'setRoleMapping');
        RoleMappingsLogic.actions.setRoleMappingsData(mappingsServerProps);
        RoleMappingsLogic.actions.initializeRoleMapping(wsRoleMapping.id);

        expect(setRoleMappingDataSpy).toHaveBeenCalledWith(wsRoleMapping);
      });

      it('does not set data for new mapping', async () => {
        const setRoleMappingDataSpy = jest.spyOn(RoleMappingsLogic.actions, 'setRoleMapping');
        RoleMappingsLogic.actions.setRoleMappingsData(mappingsServerProps);
        RoleMappingsLogic.actions.initializeRoleMapping();

        expect(setRoleMappingDataSpy).not.toHaveBeenCalledWith(wsRoleMapping);
      });
    });

    describe('initializeSingleUserRoleMapping', () => {
      let setElasticsearchUserSpy: jest.MockedFunction<any>;
      let setRoleMappingSpy: jest.MockedFunction<any>;
      let setSingleUserRoleMappingSpy: jest.MockedFunction<any>;
      beforeEach(() => {
        setElasticsearchUserSpy = jest.spyOn(RoleMappingsLogic.actions, 'setElasticsearchUser');
        setRoleMappingSpy = jest.spyOn(RoleMappingsLogic.actions, 'setRoleMapping');
        setSingleUserRoleMappingSpy = jest.spyOn(
          RoleMappingsLogic.actions,
          'setSingleUserRoleMapping'
        );
      });

      it('should handle the new user state and only set an empty mapping', () => {
        RoleMappingsLogic.actions.initializeSingleUserRoleMapping();

        expect(setElasticsearchUserSpy).not.toHaveBeenCalled();
        expect(setRoleMappingSpy).not.toHaveBeenCalled();
        expect(setSingleUserRoleMappingSpy).toHaveBeenCalledWith(undefined);
      });

      it('should handle an existing user state and set mapping', () => {
        RoleMappingsLogic.actions.setRoleMappingsData(mappingsServerProps);
        RoleMappingsLogic.actions.initializeSingleUserRoleMapping(
          wsSingleUserRoleMapping.roleMapping.id
        );

        expect(setElasticsearchUserSpy).toHaveBeenCalled();
        expect(setRoleMappingSpy).toHaveBeenCalled();
        expect(setSingleUserRoleMappingSpy).toHaveBeenCalledWith(wsSingleUserRoleMapping);
      });
    });

    describe('handleSaveMapping', () => {
      it('calls API and refreshes list when new mapping', async () => {
        const initializeRoleMappingsSpy = jest.spyOn(
          RoleMappingsLogic.actions,
          'initializeRoleMappings'
        );
        RoleMappingsLogic.actions.setRoleMappingsData(mappingsServerProps);

        http.post.mockReturnValue(Promise.resolve(mappingsServerProps));
        RoleMappingsLogic.actions.handleSaveMapping();

        expect(http.post).toHaveBeenCalledWith('/internal/workplace_search/org/role_mappings', {
          body: JSON.stringify({
            roleType: 'admin',
            allGroups: false,
            rules: {
              username: '',
            },
            groups: [defaultGroup.id],
          }),
        });
        await nextTick();

        expect(initializeRoleMappingsSpy).toHaveBeenCalled();
      });

      it('calls API and refreshes list when existing mapping', async () => {
        const initializeRoleMappingsSpy = jest.spyOn(
          RoleMappingsLogic.actions,
          'initializeRoleMappings'
        );
        RoleMappingsLogic.actions.setRoleMapping(wsRoleMapping);

        http.put.mockReturnValue(Promise.resolve(mappingsServerProps));
        RoleMappingsLogic.actions.handleSaveMapping();

        expect(http.put).toHaveBeenCalledWith(
          `/internal/workplace_search/org/role_mappings/${wsRoleMapping.id}`,
          {
            body: JSON.stringify({
              roleType: 'admin',
              allGroups: true,
              rules: {
                username: 'user',
              },
              groups: [],
            }),
          }
        );
        await nextTick();

        expect(initializeRoleMappingsSpy).toHaveBeenCalled();
      });

      it('handles error', async () => {
        const setRoleMappingErrorsSpy = jest.spyOn(
          RoleMappingsLogic.actions,
          'setRoleMappingErrors'
        );

        http.post.mockReturnValue(
          Promise.reject({
            body: {
              attributes: {
                errors: ['this is an error'],
              },
            },
          })
        );
        RoleMappingsLogic.actions.handleSaveMapping();
        await nextTick();

        expect(setRoleMappingErrorsSpy).toHaveBeenCalledWith(['this is an error']);
      });
    });

    describe('handleSaveUser', () => {
      it('calls API and refreshes list when new mapping', async () => {
        const initializeRoleMappingsSpy = jest.spyOn(
          RoleMappingsLogic.actions,
          'initializeRoleMappings'
        );
        const setUserCreatedSpy = jest.spyOn(RoleMappingsLogic.actions, 'setUserCreated');
        const setSingleUserRoleMappingSpy = jest.spyOn(
          RoleMappingsLogic.actions,
          'setSingleUserRoleMapping'
        );
        RoleMappingsLogic.actions.setRoleMappingsData(mappingsServerProps);

        http.post.mockReturnValue(Promise.resolve(mappingsServerProps));
        RoleMappingsLogic.actions.handleSaveUser();

        expect(http.post).toHaveBeenCalledWith(
          '/internal/workplace_search/org/single_user_role_mapping',
          {
            body: JSON.stringify({
              roleMapping: {
                groups: [defaultGroup.id],
                roleType: 'admin',
                allGroups: false,
              },
              elasticsearchUser: {
                username: elasticsearchUsers[0].username,
                email: elasticsearchUsers[0].email,
              },
            }),
          }
        );
        await nextTick();

        expect(initializeRoleMappingsSpy).toHaveBeenCalled();
        expect(setUserCreatedSpy).toHaveBeenCalled();
        expect(setSingleUserRoleMappingSpy).toHaveBeenCalled();
      });

      it('calls API and refreshes list when existing mapping', async () => {
        const initializeRoleMappingsSpy = jest.spyOn(
          RoleMappingsLogic.actions,
          'initializeRoleMappings'
        );
        RoleMappingsLogic.actions.setSingleUserRoleMapping(wsSingleUserRoleMapping);
        RoleMappingsLogic.actions.handleAllGroupsSelectionChange(true);

        http.put.mockReturnValue(Promise.resolve(mappingsServerProps));
        RoleMappingsLogic.actions.handleSaveUser();

        expect(http.post).toHaveBeenCalledWith(
          '/internal/workplace_search/org/single_user_role_mapping',
          {
            body: JSON.stringify({
              roleMapping: {
                groups: [],
                roleType: 'admin',
                allGroups: true,
                id: wsSingleUserRoleMapping.roleMapping.id,
              },
              elasticsearchUser: {
                username: '',
                email: '',
              },
            }),
          }
        );
        await nextTick();

        expect(initializeRoleMappingsSpy).toHaveBeenCalled();
      });

      it('handles error', async () => {
        const setRoleMappingErrorsSpy = jest.spyOn(
          RoleMappingsLogic.actions,
          'setRoleMappingErrors'
        );

        http.post.mockReturnValue(
          Promise.reject({
            body: {
              attributes: {
                errors: ['this is an error'],
              },
            },
          })
        );
        RoleMappingsLogic.actions.handleSaveUser();
        await nextTick();

        expect(setRoleMappingErrorsSpy).toHaveBeenCalledWith(['this is an error']);
      });
    });

    describe('handleDeleteMapping', () => {
      const roleMappingId = 'r1';

      it('calls API and refreshes list', async () => {
        const initializeRoleMappingsSpy = jest.spyOn(
          RoleMappingsLogic.actions,
          'initializeRoleMappings'
        );
        RoleMappingsLogic.actions.setRoleMapping(wsRoleMapping);
        http.delete.mockReturnValue(Promise.resolve({}));
        RoleMappingsLogic.actions.handleDeleteMapping(roleMappingId);

        expect(http.delete).toHaveBeenCalledWith(
          `/internal/workplace_search/org/role_mappings/${roleMappingId}`
        );
        await nextTick();

        expect(initializeRoleMappingsSpy).toHaveBeenCalled();
      });

      it('handles error', async () => {
        RoleMappingsLogic.actions.setRoleMapping(wsRoleMapping);
        http.delete.mockReturnValue(Promise.reject('this is an error'));
        RoleMappingsLogic.actions.handleDeleteMapping(roleMappingId);
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
      });
    });

    describe('handleUsernameSelectChange', () => {
      it('sets elasticsearchUser when match found', () => {
        RoleMappingsLogic.actions.setRoleMappingsData(mappingsServerProps);
        const setElasticsearchUserSpy = jest.spyOn(
          RoleMappingsLogic.actions,
          'setElasticsearchUser'
        );
        RoleMappingsLogic.actions.handleUsernameSelectChange(elasticsearchUsers[0].username);

        expect(setElasticsearchUserSpy).toHaveBeenCalledWith(elasticsearchUsers[0]);
      });

      it('does not set elasticsearchUser when no match found', () => {
        RoleMappingsLogic.actions.setRoleMappingsData(mappingsServerProps);
        const setElasticsearchUserSpy = jest.spyOn(
          RoleMappingsLogic.actions,
          'setElasticsearchUser'
        );
        RoleMappingsLogic.actions.handleUsernameSelectChange('bogus');

        expect(setElasticsearchUserSpy).not.toHaveBeenCalled();
      });
    });

    describe('setUserExistingRadioValue', () => {
      it('handles existing user', () => {
        RoleMappingsLogic.actions.setRoleMappingsData(mappingsServerProps);
        const setElasticsearchUserSpy = jest.spyOn(
          RoleMappingsLogic.actions,
          'setElasticsearchUser'
        );
        RoleMappingsLogic.actions.setUserExistingRadioValue(true);

        expect(setElasticsearchUserSpy).toHaveBeenCalledWith(elasticsearchUsers[0]);
      });

      it('handles new user', () => {
        const setElasticsearchUserSpy = jest.spyOn(
          RoleMappingsLogic.actions,
          'setElasticsearchUser'
        );
        RoleMappingsLogic.actions.setUserExistingRadioValue(false);

        expect(setElasticsearchUserSpy).toHaveBeenCalledWith(emptyUser);
      });
    });
  });
});
