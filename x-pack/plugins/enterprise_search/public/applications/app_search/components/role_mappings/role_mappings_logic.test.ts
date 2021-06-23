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

import { engines } from '../../__mocks__/engines.mock';

import { nextTick } from '@kbn/test/jest';

import { asRoleMapping } from '../../../shared/role_mapping/__mocks__/roles';
import { ANY_AUTH_PROVIDER } from '../../../shared/role_mapping/constants';

import { RoleMappingsLogic } from './role_mappings_logic';

describe('RoleMappingsLogic', () => {
  const { http } = mockHttpValues;
  const { clearFlashMessages, flashAPIErrors, setSuccessMessage } = mockFlashMessageHelpers;
  const { mount } = new LogicMounter(RoleMappingsLogic);
  const DEFAULT_VALUES = {
    attributes: [],
    availableAuthProviders: [],
    elasticsearchRoles: [],
    roleMapping: null,
    roleMappingFlyoutOpen: false,
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
    selectedOptions: [],
    roleMappingErrors: [],
  };

  const mappingsServerProps = {
    multipleAuthProvidersConfig: true,
    roleMappings: [asRoleMapping],
    attributes: ['email', 'metadata', 'username', 'role'],
    authProviders: [ANY_AUTH_PROVIDER],
    availableEngines: engines,
    elasticsearchRoles: [],
    hasAdvancedRoles: false,
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

        expect(RoleMappingsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          roleMappings: [asRoleMapping],
          dataLoading: false,
          attributes: mappingsServerProps.attributes,
          availableAuthProviders: mappingsServerProps.authProviders,
          availableEngines: mappingsServerProps.availableEngines,
          accessAllEngines: true,
          multipleAuthProvidersConfig: true,
          attributeName: 'username',
          attributeValue: '',
          elasticsearchRoles: mappingsServerProps.elasticsearchRoles,
          selectedEngines: new Set(),
          selectedOptions: [],
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
        ...mappingsServerProps,
        roleMappings: [
          {
            ...asRoleMapping,
            engines: [engine, otherEngine],
          },
        ],
        selectedEngines: new Set([engine.name]),
      };

      beforeEach(() => {
        mount(mountedValues);
      });

      it('handles adding an engine to selected engines', () => {
        RoleMappingsLogic.actions.handleEngineSelectionChange([engine.name, otherEngine.name]);

        expect(RoleMappingsLogic.values.selectedEngines).toEqual(
          new Set([engine.name, otherEngine.name])
        );
        expect(RoleMappingsLogic.values.selectedOptions).toEqual([
          { label: engine.name, value: engine.name },
          { label: otherEngine.name, value: otherEngine.name },
        ]);
      });
      it('handles removing an engine from selected engines', () => {
        RoleMappingsLogic.actions.handleEngineSelectionChange([engine.name]);

        expect(RoleMappingsLogic.values.selectedEngines).toEqual(new Set([engine.name]));
        expect(RoleMappingsLogic.values.selectedOptions).toEqual([
          { label: engine.name, value: engine.name },
        ]);
      });
    });

    it('handleAccessAllEnginesChange', () => {
      RoleMappingsLogic.actions.handleAccessAllEnginesChange(false);

      expect(RoleMappingsLogic.values).toEqual({
        ...DEFAULT_VALUES,
        accessAllEngines: false,
      });
    });

    describe('handleAttributeSelectorChange', () => {
      const elasticsearchRoles = ['foo', 'bar'];

      it('sets values correctly', () => {
        mount({
          ...mappingsServerProps,
          elasticsearchRoles,
        });
        RoleMappingsLogic.actions.handleAttributeSelectorChange('role', elasticsearchRoles[0]);

        expect(RoleMappingsLogic.values).toEqual({
          ...DEFAULT_VALUES,
          multipleAuthProvidersConfig: true,
          attributeValue: elasticsearchRoles[0],
          roleMappings: [asRoleMapping],
          roleMapping: null,
          attributes: mappingsServerProps.attributes,
          availableEngines: mappingsServerProps.availableEngines,
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
          ...mappingsServerProps,
          roleMappings: [
            {
              ...asRoleMapping,
              authProvider: ['foo'],
            },
          ],
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
          ...mappingsServerProps,
          roleMappings: [
            {
              ...asRoleMapping,
              authProvider: [ANY_AUTH_PROVIDER],
            },
          ],
        });
        RoleMappingsLogic.actions.handleAuthProviderChange(providerWithAny);

        expect(RoleMappingsLogic.values.selectedAuthProviders).toEqual([providers[1]]);
      });
    });

    it('resetState', () => {
      mount(mappingsServerProps);
      RoleMappingsLogic.actions.resetState();

      expect(RoleMappingsLogic.values).toEqual(DEFAULT_VALUES);
      expect(clearFlashMessages).toHaveBeenCalled();
    });

    it('openRoleMappingFlyout', () => {
      mount(mappingsServerProps);
      RoleMappingsLogic.actions.openRoleMappingFlyout();

      expect(RoleMappingsLogic.values.roleMappingFlyoutOpen).toEqual(true);
      expect(clearFlashMessages).toHaveBeenCalled();
    });

    it('closeRoleMappingFlyout', () => {
      mount({
        ...mappingsServerProps,
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
      it('sets values for existing mapping', () => {
        const setRoleMappingDataSpy = jest.spyOn(RoleMappingsLogic.actions, 'setRoleMapping');
        RoleMappingsLogic.actions.setRoleMappingsData(mappingsServerProps);
        RoleMappingsLogic.actions.initializeRoleMapping(asRoleMapping.id);

        expect(setRoleMappingDataSpy).toHaveBeenCalledWith(asRoleMapping);
      });

      it('does not set data for new mapping', async () => {
        const setRoleMappingDataSpy = jest.spyOn(RoleMappingsLogic.actions, 'setRoleMapping');
        RoleMappingsLogic.actions.setRoleMappingsData(mappingsServerProps);
        RoleMappingsLogic.actions.initializeRoleMapping();

        expect(setRoleMappingDataSpy).not.toHaveBeenCalledWith(asRoleMapping);
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

      it('calls API and refreshes list when new mapping', async () => {
        mount(mappingsServerProps);
        const initializeRoleMappingsSpy = jest.spyOn(
          RoleMappingsLogic.actions,
          'initializeRoleMappings'
        );

        http.post.mockReturnValue(Promise.resolve(mappingsServerProps));
        RoleMappingsLogic.actions.handleSaveMapping();

        expect(http.post).toHaveBeenCalledWith('/api/app_search/role_mappings', {
          body: JSON.stringify(body),
        });
        await nextTick();

        expect(initializeRoleMappingsSpy).toHaveBeenCalled();
      });

      it('calls API and refreshes list when existing mapping', async () => {
        mount({
          ...mappingsServerProps,
          roleMapping: asRoleMapping,
        });
        const initializeRoleMappingsSpy = jest.spyOn(
          RoleMappingsLogic.actions,
          'initializeRoleMappings'
        );

        http.put.mockReturnValue(Promise.resolve(mappingsServerProps));
        RoleMappingsLogic.actions.handleSaveMapping();

        expect(http.put).toHaveBeenCalledWith(`/api/app_search/role_mappings/${asRoleMapping.id}`, {
          body: JSON.stringify(body),
        });
        await nextTick();

        expect(initializeRoleMappingsSpy).toHaveBeenCalled();
        expect(setSuccessMessage).toHaveBeenCalled();
      });

      it('sends array when "accessAllEngines" is false', () => {
        const engine = engines[0];

        mount({
          ...mappingsServerProps,
          accessAllEngines: false,
          selectedEngines: new Set([engine.name]),
          roleMapping: asRoleMapping,
        });

        http.put.mockReturnValue(Promise.resolve(mappingsServerProps));
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
        mount(mappingsServerProps);
        const initializeRoleMappingsSpy = jest.spyOn(
          RoleMappingsLogic.actions,
          'initializeRoleMappings'
        );
        http.delete.mockReturnValue(Promise.resolve({}));
        RoleMappingsLogic.actions.handleDeleteMapping(roleMappingId);

        expect(http.delete).toHaveBeenCalledWith(`/api/app_search/role_mappings/${roleMappingId}`);
        await nextTick();

        expect(initializeRoleMappingsSpy).toHaveBeenCalled();
        expect(setSuccessMessage).toHaveBeenCalled();
      });

      it('handles error', async () => {
        mount(mappingsServerProps);
        http.delete.mockReturnValue(Promise.reject('this is an error'));
        RoleMappingsLogic.actions.handleDeleteMapping(roleMappingId);
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
      });

      it('will do nothing if not confirmed', () => {
        mount(mappingsServerProps);
        jest.spyOn(window, 'confirm').mockReturnValueOnce(false);
        RoleMappingsLogic.actions.handleDeleteMapping(roleMappingId);

        expect(http.delete).not.toHaveBeenCalled();
      });
    });
  });
});
