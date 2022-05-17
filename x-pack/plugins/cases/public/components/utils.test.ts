/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionTypeRegistryMock } from '@kbn/triggers-actions-ui-plugin/public/application/action_type_registry.mock';
import { triggersActionsUiMock } from '@kbn/triggers-actions-ui-plugin/public/mocks';
import { getConnectorIcon, isDeprecatedConnector } from './utils';

describe('Utils', () => {
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

  describe('isDeprecatedConnector', () => {
    const connector = {
      id: 'test',
      actionTypeId: '.webhook',
      name: 'Test',
      config: { usesTableApi: false },
      secrets: {},
      isPreconfigured: false,
      isDeprecated: false,
    };

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
  });
});
