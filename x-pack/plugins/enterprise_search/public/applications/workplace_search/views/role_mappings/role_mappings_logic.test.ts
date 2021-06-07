/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockFlashMessageHelpers, mockHttpValues } from '../../../__mocks__';
import { LogicMounter } from '../../../__mocks__/kea.mock';

import { groups } from '../../__mocks__/groups.mock';

import { nextTick } from '@kbn/test/jest';

import { wsRoleMapping } from '../../../shared/role_mapping/__mocks__/roles';
import { ANY_AUTH_PROVIDER, ROLE_MAPPING_NOT_FOUND } from '../../../shared/role_mapping/constants';

import { RoleMappingsLogic } from './role_mappings_logic';

describe('RoleMappingsLogic', () => {
  const { http } = mockHttpValues;
  const { clearFlashMessages, flashAPIErrors, setErrorMessage } = mockFlashMessageHelpers;
  const { mount } = new LogicMounter(RoleMappingsLogic);
  const defaultValues = {
    attributes: [],
    availableAuthProviders: [],
    elasticsearchRoles: [],
    roleMapping: null,
    roleMappingFlyoutOpen: false,
    roleMappings: [],
    roleType: 'admin',
    attributeValue: '',
    attributeName: 'username',
    dataLoading: true,
    multipleAuthProvidersConfig: false,
    availableGroups: [],
    selectedGroups: new Set(),
    includeInAllGroups: false,
    selectedAuthProviders: [ANY_AUTH_PROVIDER],
    selectedOptions: [],
    roleMappingErrors: [],
  };
  const roleGroup = {
    id: '123',
    name: 'Role Group',
  };
  const defaultGroup = {
    id: '124',
    name: 'Default',
  };

  const mappingsServerProps = { multipleAuthProvidersConfig: true, roleMappings: [wsRoleMapping] };
  const mappingServerProps = {
    attributes: [],
    authProviders: [],
    availableGroups: [roleGroup, defaultGroup],
    elasticsearchRoles: [],
    multipleAuthProvidersConfig: false,
    roleMapping: wsRoleMapping,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mount();
  });

  it('has expected default values', () => {
    expect(RoleMappingsLogic.values).toEqual(defaultValues);
  });

  describe('actions', () => {
    it('setRoleMappingsData', () => {
      RoleMappingsLogic.actions.setRoleMappingsData(mappingsServerProps);

      expect(RoleMappingsLogic.values.roleMappings).toEqual([wsRoleMapping]);
      expect(RoleMappingsLogic.values.dataLoading).toEqual(false);
      expect(RoleMappingsLogic.values.multipleAuthProvidersConfig).toEqual(true);
    });

    describe('setRoleMappingData', () => {
      it('sets data correctly', () => {
        RoleMappingsLogic.actions.setRoleMappingData(mappingServerProps);

        expect(RoleMappingsLogic.values.roleMapping).toEqual(wsRoleMapping);
        expect(RoleMappingsLogic.values.dataLoading).toEqual(false);
        expect(RoleMappingsLogic.values.attributes).toEqual(mappingServerProps.attributes);
        expect(RoleMappingsLogic.values.availableGroups).toEqual(
          mappingServerProps.availableGroups
        );
        expect(RoleMappingsLogic.values.includeInAllGroups).toEqual(true);
        expect(RoleMappingsLogic.values.elasticsearchRoles).toEqual(
          mappingServerProps.elasticsearchRoles
        );
        expect(RoleMappingsLogic.values.selectedGroups).toEqual(
          new Set([wsRoleMapping.groups[0].id])
        );
        expect(RoleMappingsLogic.values.selectedOptions).toEqual([]);
      });

      it('sets default group with new role mapping', () => {
        RoleMappingsLogic.actions.setRoleMappingData({
          ...mappingServerProps,
          roleMapping: undefined,
        });

        expect(RoleMappingsLogic.values.selectedGroups).toEqual(new Set([defaultGroup.id]));
      });
    });

    it('handleRoleChange', () => {
      RoleMappingsLogic.actions.handleRoleChange('user');

      expect(RoleMappingsLogic.values.roleType).toEqual('user');
    });

    it('handleGroupSelectionChange', () => {
      const group = wsRoleMapping.groups[0];
      const otherGroup = groups[0];
      RoleMappingsLogic.actions.setRoleMappingData({
        ...mappingServerProps,
        roleMapping: {
          ...wsRoleMapping,
          groups: [group, otherGroup],
        },
      });

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

    describe('handleAttributeSelectorChange', () => {
      const elasticsearchRoles = ['foo', 'bar'];

      it('sets values correctly', () => {
        RoleMappingsLogic.actions.setRoleMappingData({
          ...mappingServerProps,
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

    describe('handleAuthProviderChange', () => {
      beforeEach(() => {
        RoleMappingsLogic.actions.setRoleMappingData({
          ...mappingServerProps,
          roleMapping: {
            ...wsRoleMapping,
            authProvider: ['foo'],
          },
        });
      });
      const providers = ['bar', 'baz'];
      const providerWithAny = [ANY_AUTH_PROVIDER, providers[1]];
      it('handles empty state', () => {
        RoleMappingsLogic.actions.handleAuthProviderChange([]);

        expect(RoleMappingsLogic.values.selectedAuthProviders).toEqual([ANY_AUTH_PROVIDER]);
      });

      it('handles single value', () => {
        RoleMappingsLogic.actions.handleAuthProviderChange([providers[0]]);

        expect(RoleMappingsLogic.values.selectedAuthProviders).toEqual([providers[0]]);
      });

      it('handles multiple values', () => {
        RoleMappingsLogic.actions.handleAuthProviderChange(providers);

        expect(RoleMappingsLogic.values.selectedAuthProviders).toEqual(providers);
      });

      it('handles "any" auth in previous state', () => {
        RoleMappingsLogic.actions.setRoleMappingData({
          ...mappingServerProps,
          roleMapping: {
            ...wsRoleMapping,
            authProvider: [ANY_AUTH_PROVIDER],
          },
        });
        RoleMappingsLogic.actions.handleAuthProviderChange(providerWithAny);

        expect(RoleMappingsLogic.values.selectedAuthProviders).toEqual([providers[1]]);
      });

      it('handles catch-all state', () => {
        RoleMappingsLogic.actions.handleAuthProviderChange(providerWithAny);

        expect(RoleMappingsLogic.values.selectedAuthProviders).toEqual([ANY_AUTH_PROVIDER]);
      });
    });

    it('resetState', () => {
      RoleMappingsLogic.actions.setRoleMappingsData(mappingsServerProps);
      RoleMappingsLogic.actions.setRoleMappingData(mappingServerProps);
      RoleMappingsLogic.actions.resetState();

      expect(RoleMappingsLogic.values.dataLoading).toEqual(true);
      expect(RoleMappingsLogic.values.roleMappings).toEqual([]);
      expect(RoleMappingsLogic.values.roleMapping).toEqual(null);
      expect(RoleMappingsLogic.values.attributeValue).toEqual('');
      expect(RoleMappingsLogic.values.attributeName).toEqual('username');
      expect(clearFlashMessages).toHaveBeenCalled();
    });

    it('openRoleMappingFlyout', () => {
      mount(mappingServerProps);
      RoleMappingsLogic.actions.openRoleMappingFlyout();

      expect(RoleMappingsLogic.values.roleMappingFlyoutOpen).toEqual(true);
      expect(clearFlashMessages).toHaveBeenCalled();
    });

    it('closeRoleMappingFlyout', () => {
      mount({
        ...mappingServerProps,
        roleMappingFlyoutOpen: true,
      });
      RoleMappingsLogic.actions.closeRoleMappingFlyout();

      expect(RoleMappingsLogic.values.roleMappingFlyoutOpen).toEqual(false);
      expect(clearFlashMessages).toHaveBeenCalled();
    });
  });

  describe('listeners', () => {
    describe('initializeRoleMappings', () => {
      it('calls API and sets values', async () => {
        const setRoleMappingsDataSpy = jest.spyOn(RoleMappingsLogic.actions, 'setRoleMappingsData');
        http.get.mockReturnValue(Promise.resolve(mappingsServerProps));
        RoleMappingsLogic.actions.initializeRoleMappings();

        expect(http.get).toHaveBeenCalledWith('/api/workplace_search/org/role_mappings');
        await nextTick();
        expect(setRoleMappingsDataSpy).toHaveBeenCalledWith(mappingsServerProps);
      });

      it('handles error', async () => {
        http.get.mockReturnValue(Promise.reject('this is an error'));
        RoleMappingsLogic.actions.initializeRoleMappings();
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
      });
    });

    describe('initializeRoleMapping', () => {
      it('calls API and sets values for new mapping', async () => {
        const setRoleMappingDataSpy = jest.spyOn(RoleMappingsLogic.actions, 'setRoleMappingData');
        http.get.mockReturnValue(Promise.resolve(mappingServerProps));
        RoleMappingsLogic.actions.initializeRoleMapping();

        expect(http.get).toHaveBeenCalledWith('/api/workplace_search/org/role_mappings/new');
        await nextTick();
        expect(setRoleMappingDataSpy).toHaveBeenCalledWith(mappingServerProps);
      });

      it('calls API and sets values for existing mapping', async () => {
        const setRoleMappingDataSpy = jest.spyOn(RoleMappingsLogic.actions, 'setRoleMappingData');
        http.get.mockReturnValue(Promise.resolve(mappingServerProps));
        RoleMappingsLogic.actions.initializeRoleMapping('123');

        expect(http.get).toHaveBeenCalledWith('/api/workplace_search/org/role_mappings/123');
        await nextTick();
        expect(setRoleMappingDataSpy).toHaveBeenCalledWith(mappingServerProps);
      });

      it('handles error', async () => {
        http.get.mockReturnValue(Promise.reject('this is an error'));
        RoleMappingsLogic.actions.initializeRoleMapping();
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
      });

      it('shows error when there is a 404 status', async () => {
        http.get.mockReturnValue(Promise.reject({ status: 404 }));
        RoleMappingsLogic.actions.initializeRoleMapping();
        await nextTick();

        expect(setErrorMessage).toHaveBeenCalledWith(ROLE_MAPPING_NOT_FOUND);
      });
    });

    describe('handleSaveMapping', () => {
      it('calls API and refreshes list when new mapping', async () => {
        const initializeRoleMappingsSpy = jest.spyOn(
          RoleMappingsLogic.actions,
          'initializeRoleMappings'
        );
        RoleMappingsLogic.actions.setRoleMappingsData(mappingsServerProps);

        http.post.mockReturnValue(Promise.resolve(mappingServerProps));
        RoleMappingsLogic.actions.handleSaveMapping();

        expect(http.post).toHaveBeenCalledWith('/api/workplace_search/org/role_mappings', {
          body: JSON.stringify({
            roleType: 'admin',
            allGroups: false,
            authProvider: [ANY_AUTH_PROVIDER],
            rules: {
              username: '',
            },
            groups: [],
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
        RoleMappingsLogic.actions.setRoleMappingData(mappingServerProps);

        http.put.mockReturnValue(Promise.resolve(mappingServerProps));
        RoleMappingsLogic.actions.handleSaveMapping();

        expect(http.put).toHaveBeenCalledWith(
          `/api/workplace_search/org/role_mappings/${wsRoleMapping.id}`,
          {
            body: JSON.stringify({
              roleType: 'admin',
              allGroups: true,
              authProvider: [ANY_AUTH_PROVIDER, 'other_auth'],
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

    describe('handleDeleteMapping', () => {
      let confirmSpy: any;
      const roleMappingId = 'r1';

      beforeEach(() => {
        confirmSpy = jest.spyOn(window, 'confirm');
        confirmSpy.mockImplementation(jest.fn(() => true));
      });

      afterEach(() => {
        confirmSpy.mockRestore();
      });

      it('calls API and refreshes list', async () => {
        const initializeRoleMappingsSpy = jest.spyOn(
          RoleMappingsLogic.actions,
          'initializeRoleMappings'
        );
        RoleMappingsLogic.actions.setRoleMappingData(mappingServerProps);
        http.delete.mockReturnValue(Promise.resolve({}));
        RoleMappingsLogic.actions.handleDeleteMapping(roleMappingId);

        expect(http.delete).toHaveBeenCalledWith(
          `/api/workplace_search/org/role_mappings/${roleMappingId}`
        );
        await nextTick();

        expect(initializeRoleMappingsSpy).toHaveBeenCalled();
      });

      it('handles error', async () => {
        RoleMappingsLogic.actions.setRoleMappingData(mappingServerProps);
        http.delete.mockReturnValue(Promise.reject('this is an error'));
        RoleMappingsLogic.actions.handleDeleteMapping(roleMappingId);
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
      });

      it('will do nothing if not confirmed', async () => {
        RoleMappingsLogic.actions.setRoleMappingData(mappingServerProps);
        window.confirm = () => false;
        RoleMappingsLogic.actions.handleDeleteMapping(roleMappingId);

        expect(http.delete).not.toHaveBeenCalled();
        await nextTick();
      });
    });
  });
});
