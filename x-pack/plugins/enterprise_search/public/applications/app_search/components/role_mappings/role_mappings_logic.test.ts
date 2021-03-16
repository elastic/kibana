/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockFlashMessageHelpers, mockHttpValues, mockKibanaValues } from '../../../__mocks__';
import { LogicMounter } from '../../../__mocks__/kea.mock';

import { engines } from '../../__mocks__/engines.mock';

import { nextTick } from '@kbn/test/jest';

import { asRoleMapping } from '../../../shared/role_mapping/__mocks__/roles';
import { ANY_AUTH_PROVIDER } from '../../../shared/role_mapping/constants';

import { RoleMappingsLogic } from './role_mappings_logic';

describe('RoleMappingsLogic', () => {
  const { http } = mockHttpValues;
  const { navigateToUrl } = mockKibanaValues;
  const { clearFlashMessages, flashAPIErrors, setSuccessMessage } = mockFlashMessageHelpers;
  const { mount } = new LogicMounter(RoleMappingsLogic);
  const DEFAULT_VALUES = {
    attributes: [],
    availableAuthProviders: [],
    elasticsearchRoles: [],
    roleMapping: null,
    roleMappings: [],
    roleType: 'owner',
    attributeValue: '',
    attributeName: 'username',
    dataLoading: true,
    hasAdvancedRoles: false,
    multipleAuthProvidersConfig: false,
    availableEngines: [],
    selectedEngines: new Set(),
    accessAllEngines: true,
    selectedAuthProviders: [ANY_AUTH_PROVIDER],
  };

  const mappingsServerProps = { multipleAuthProvidersConfig: true, roleMappings: [asRoleMapping] };
  const mappingServerProps = {
    attributes: ['email', 'metadata', 'username', 'role'],
    authProviders: [ANY_AUTH_PROVIDER],
    availableEngines: engines,
    elasticsearchRoles: [],
    hasAdvancedRoles: false,
    multipleAuthProvidersConfig: false,
    roleMapping: asRoleMapping,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mount();
  });

  it('has expected default values', () => {
    expect(RoleMappingsLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('setRoleMappingsData', () => {
      it('sets data based on server response from the `mappings` (plural) endpoint', () => {
        RoleMappingsLogic.actions.setRoleMappingsData(mappingsServerProps);

        expect(RoleMappingsLogic.values.roleMappings).toEqual([asRoleMapping]);
        expect(RoleMappingsLogic.values.dataLoading).toEqual(false);
        expect(RoleMappingsLogic.values.multipleAuthProvidersConfig).toEqual(true);
      });
    });

    describe('setRoleMappingData', () => {
      it('sets state based on server response from the `mapping` (singular) endpoint', () => {
        RoleMappingsLogic.actions.setRoleMappingData(mappingServerProps);

        expect(RoleMappingsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          roleMapping: asRoleMapping,
          dataLoading: false,
          attributes: mappingServerProps.attributes,
          availableAuthProviders: mappingServerProps.authProviders,
          availableEngines: mappingServerProps.availableEngines,
          accessAllEngines: true,
          attributeName: 'role',
          attributeValue: 'superuser',
          elasticsearchRoles: mappingServerProps.elasticsearchRoles,
          selectedEngines: new Set(engines.map((e) => e.name)),
        });
      });

      it('will remove all selected engines if no roleMapping was returned from the server', () => {
        RoleMappingsLogic.actions.setRoleMappingData({
          ...mappingServerProps,
          roleMapping: undefined,
        });

        expect(RoleMappingsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          dataLoading: false,
          selectedEngines: new Set(),
          attributes: mappingServerProps.attributes,
          availableAuthProviders: mappingServerProps.authProviders,
          availableEngines: mappingServerProps.availableEngines,
        });
      });
    });

    it('handleRoleChange', () => {
      RoleMappingsLogic.actions.handleRoleChange('dev');

      expect(RoleMappingsLogic.values).toEqual({
        ...DEFAULT_VALUES,
        roleType: 'dev',
        accessAllEngines: false,
      });
    });

    describe('handleEngineSelectionChange', () => {
      const engine = engines[0];
      const otherEngine = engines[1];
      const mountedValues = {
        ...mappingServerProps,
        roleMapping: {
          ...asRoleMapping,
          engines: [engine, otherEngine],
        },
        selectedEngines: new Set([engine.name]),
      };

      beforeEach(() => {
        mount(mountedValues);
      });

      it('handles adding an engine to selected engines', () => {
        RoleMappingsLogic.actions.handleEngineSelectionChange(otherEngine.name, true);

        expect(RoleMappingsLogic.values.selectedEngines).toEqual(
          new Set([engine.name, otherEngine.name])
        );
      });
      it('handles removing an engine from selected engines', () => {
        RoleMappingsLogic.actions.handleEngineSelectionChange(otherEngine.name, false);

        expect(RoleMappingsLogic.values.selectedEngines).toEqual(new Set([engine.name]));
      });
    });

    it('handleAccessAllEnginesChange', () => {
      RoleMappingsLogic.actions.handleAccessAllEnginesChange();

      expect(RoleMappingsLogic.values).toEqual({
        ...DEFAULT_VALUES,
        accessAllEngines: false,
      });
    });

    describe('handleAttributeSelectorChange', () => {
      const elasticsearchRoles = ['foo', 'bar'];

      it('sets values correctly', () => {
        mount({
          ...mappingServerProps,
          elasticsearchRoles,
        });
        RoleMappingsLogic.actions.handleAttributeSelectorChange('role', elasticsearchRoles[0]);

        expect(RoleMappingsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          attributeValue: elasticsearchRoles[0],
          roleMapping: asRoleMapping,
          attributes: mappingServerProps.attributes,
          availableEngines: mappingServerProps.availableEngines,
          accessAllEngines: true,
          attributeName: 'role',
          elasticsearchRoles,
          selectedEngines: new Set(),
        });
      });

      it('correctly handles "role" fallback', () => {
        RoleMappingsLogic.actions.handleAttributeSelectorChange('username', elasticsearchRoles[0]);

        expect(RoleMappingsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          attributeValue: '',
        });
      });
    });

    it('handleAttributeValueChange', () => {
      RoleMappingsLogic.actions.handleAttributeValueChange('changed_value');

      expect(RoleMappingsLogic.values).toEqual({
        ...DEFAULT_VALUES,
        attributeValue: 'changed_value',
      });
    });

    describe('handleAuthProviderChange', () => {
      beforeEach(() => {
        mount({
          ...mappingServerProps,
          roleMapping: {
            ...asRoleMapping,
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
        mount({
          ...mappingServerProps,
          roleMapping: {
            ...asRoleMapping,
            authProvider: [ANY_AUTH_PROVIDER],
          },
        });
        RoleMappingsLogic.actions.handleAuthProviderChange(providerWithAny);

        expect(RoleMappingsLogic.values.selectedAuthProviders).toEqual([providers[1]]);
      });
    });

    it('resetState', () => {
      mount(mappingsServerProps);
      mount(mappingServerProps);
      RoleMappingsLogic.actions.resetState();

      expect(RoleMappingsLogic.values).toEqual(DEFAULT_VALUES);
      expect(clearFlashMessages).toHaveBeenCalled();
    });
  });

  describe('listeners', () => {
    describe('initializeRoleMappings', () => {
      it('calls API and sets values', async () => {
        const setRoleMappingsDataSpy = jest.spyOn(RoleMappingsLogic.actions, 'setRoleMappingsData');
        http.get.mockReturnValue(Promise.resolve(mappingsServerProps));
        RoleMappingsLogic.actions.initializeRoleMappings();

        expect(http.get).toHaveBeenCalledWith('/api/app_search/role_mappings');
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

        expect(http.get).toHaveBeenCalledWith('/api/app_search/role_mappings/new');
        await nextTick();
        expect(setRoleMappingDataSpy).toHaveBeenCalledWith(mappingServerProps);
      });

      it('calls API and sets values for existing mapping', async () => {
        const setRoleMappingDataSpy = jest.spyOn(RoleMappingsLogic.actions, 'setRoleMappingData');
        http.get.mockReturnValue(Promise.resolve(mappingServerProps));
        RoleMappingsLogic.actions.initializeRoleMapping('123');

        expect(http.get).toHaveBeenCalledWith('/api/app_search/role_mappings/123');
        await nextTick();
        expect(setRoleMappingDataSpy).toHaveBeenCalledWith(mappingServerProps);
      });

      it('handles error', async () => {
        http.get.mockReturnValue(Promise.reject('this is an error'));
        RoleMappingsLogic.actions.initializeRoleMapping();
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
      });

      it('redirects when there is a 404 status', async () => {
        http.get.mockReturnValue(Promise.reject({ status: 404 }));
        RoleMappingsLogic.actions.initializeRoleMapping();
        await nextTick();

        expect(navigateToUrl).toHaveBeenCalled();
      });
    });

    describe('handleResetMappings', () => {
      const callback = jest.fn();
      it('calls API and executes callback', async () => {
        http.post.mockReturnValue(Promise.resolve({}));
        RoleMappingsLogic.actions.handleResetMappings(callback);

        expect(http.post).toHaveBeenCalledWith('/api/app_search/role_mappings/reset');
        await nextTick();
        expect(callback).toHaveBeenCalled();
      });

      it('handles error', async () => {
        http.post.mockReturnValue(Promise.reject('this is an error'));
        RoleMappingsLogic.actions.handleResetMappings(callback);
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
        expect(callback).toHaveBeenCalled();
      });
    });

    describe('handleSaveMapping', () => {
      const body = {
        roleType: 'owner',
        accessAllEngines: true,
        authProvider: [ANY_AUTH_PROVIDER],
        rules: {
          username: '',
        },
        engines: [],
      };

      it('calls API and navigates when new mapping', async () => {
        mount(mappingsServerProps);

        http.post.mockReturnValue(Promise.resolve(mappingServerProps));
        RoleMappingsLogic.actions.handleSaveMapping();

        expect(http.post).toHaveBeenCalledWith('/api/app_search/role_mappings', {
          body: JSON.stringify(body),
        });
        await nextTick();

        expect(navigateToUrl).toHaveBeenCalled();
      });

      it('calls API and navigates when existing mapping', async () => {
        mount(mappingServerProps);

        http.put.mockReturnValue(Promise.resolve(mappingServerProps));
        RoleMappingsLogic.actions.handleSaveMapping();

        expect(http.put).toHaveBeenCalledWith(`/api/app_search/role_mappings/${asRoleMapping.id}`, {
          body: JSON.stringify(body),
        });
        await nextTick();

        expect(navigateToUrl).toHaveBeenCalled();
        expect(setSuccessMessage).toHaveBeenCalled();
      });

      it('sends array when "accessAllEngines" is false', () => {
        const engine = engines[0];

        mount({
          ...mappingServerProps,
          accessAllEngines: false,
          selectedEngines: new Set([engine.name]),
        });

        http.put.mockReturnValue(Promise.resolve(mappingServerProps));
        RoleMappingsLogic.actions.handleSaveMapping();

        expect(http.put).toHaveBeenCalledWith(`/api/app_search/role_mappings/${asRoleMapping.id}`, {
          body: JSON.stringify({
            ...body,
            accessAllEngines: false,
            engines: [engine.name],
          }),
        });
      });

      it('handles error', async () => {
        http.post.mockReturnValue(Promise.reject('this is an error'));
        RoleMappingsLogic.actions.handleSaveMapping();
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
      });
    });

    describe('handleDeleteMapping', () => {
      let confirmSpy: any;

      beforeEach(() => {
        confirmSpy = jest.spyOn(window, 'confirm');
        confirmSpy.mockImplementation(jest.fn(() => true));
      });

      afterEach(() => {
        confirmSpy.mockRestore();
      });

      it('returns when no mapping', () => {
        RoleMappingsLogic.actions.handleDeleteMapping();

        expect(http.delete).not.toHaveBeenCalled();
      });

      it('calls API and navigates', async () => {
        mount(mappingServerProps);
        http.delete.mockReturnValue(Promise.resolve({}));
        RoleMappingsLogic.actions.handleDeleteMapping();

        expect(http.delete).toHaveBeenCalledWith(
          `/api/app_search/role_mappings/${asRoleMapping.id}`
        );
        await nextTick();

        expect(navigateToUrl).toHaveBeenCalled();
        expect(setSuccessMessage).toHaveBeenCalled();
      });

      it('handles error', async () => {
        mount(mappingServerProps);
        http.delete.mockReturnValue(Promise.reject('this is an error'));
        RoleMappingsLogic.actions.handleDeleteMapping();
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
      });

      it('will do nothing if not confirmed', () => {
        mount(mappingServerProps);
        jest.spyOn(window, 'confirm').mockReturnValueOnce(false);
        RoleMappingsLogic.actions.handleDeleteMapping();

        expect(http.delete).not.toHaveBeenCalled();
      });
    });
  });
});
