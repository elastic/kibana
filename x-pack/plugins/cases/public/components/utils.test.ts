/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionTypeRegistryMock } from '@kbn/triggers-actions-ui-plugin/public/application/action_type_registry.mock';
import { triggersActionsUiMock } from '@kbn/triggers-actions-ui-plugin/public/mocks';
import {
  connectorDeprecationValidator,
  getConnectorIcon,
  isDeprecatedConnector,
  removeItemFromSessionStorage,
} from './utils';

describe('Utils', () => {
  const connector = {
    id: 'test',
    actionTypeId: '.webhook',
    name: 'Test',
    config: { usesTableApi: false },
    secrets: {},
    isPreconfigured: false,
    isDeprecated: false,
  };

  describe('getConnectorIcon', () => {
    const { createMockActionTypeModel } = actionTypeRegistryMock;
    const mockTriggersActionsUiService = triggersActionsUiMock.createStart();
    mockTriggersActionsUiService.actionTypeRegistry.register(
      createMockActionTypeModel({ id: '.test', iconClass: 'test' })
    );

    it('it returns the correct icon class', () => {
      expect(getConnectorIcon(mockTriggersActionsUiService, '.test')).toBe('test');
    });

    it('it returns an empty string if the type is undefined', () => {
      expect(getConnectorIcon(mockTriggersActionsUiService)).toBe('');
    });

    it('it returns an empty string if the type is not registered', () => {
      expect(getConnectorIcon(mockTriggersActionsUiService, '.not-registered')).toBe('');
    });

    it('it returns an empty string if it throws', () => {
      mockTriggersActionsUiService.actionTypeRegistry.get = () => {
        throw new Error();
      };

      expect(getConnectorIcon(mockTriggersActionsUiService, '.not-registered')).toBe('');
    });
  });

  describe('connectorDeprecationValidator', () => {
    it('returns undefined if the connector is not deprecated', () => {
      expect(connectorDeprecationValidator(connector)).toBe(undefined);
    });

    it('returns a deprecation message if the connector is deprecated', () => {
      expect(connectorDeprecationValidator({ ...connector, isDeprecated: true })).toEqual({
        message: 'Deprecated connector',
      });
    });
  });

  describe('isDeprecatedConnector', () => {
    it('returns false if the connector is not defined', () => {
      expect(isDeprecatedConnector()).toBe(false);
    });

    it('returns false if the connector is marked as deprecated', () => {
      expect(isDeprecatedConnector({ ...connector, isDeprecated: false })).toBe(false);
    });

    it('returns true if the connector is marked as deprecated', () => {
      expect(isDeprecatedConnector({ ...connector, isDeprecated: true })).toBe(true);
    });

    it('returns true if the connector is marked as deprecated (preconfigured connector)', () => {
      expect(
        isDeprecatedConnector({ ...connector, isDeprecated: true, isPreconfigured: true })
      ).toBe(true);
    });

    it('returns false if the connector is not marked as deprecated (preconfigured connector)', () => {
      expect(
        isDeprecatedConnector({ ...connector, isDeprecated: false, isPreconfigured: true })
      ).toBe(false);
    });
  });

  describe('removeItemFromSessionStorage', () => {
    const sessionKey = 'testKey';
    const sessionValue = 'test value';

    afterEach(() => {
      sessionStorage.removeItem(sessionKey);
    });

    it('successfully removes key from session storage', () => {
      sessionStorage.setItem(sessionKey, sessionValue);

      expect(sessionStorage.getItem(sessionKey)).toBe(sessionValue);

      removeItemFromSessionStorage(sessionKey);

      expect(sessionStorage.getItem(sessionKey)).toBe(null);
    });

    it('is null if key is not in session storage', () => {
      removeItemFromSessionStorage(sessionKey);

      expect(sessionStorage.getItem(sessionKey)).toBe(null);
    });
  });
});
