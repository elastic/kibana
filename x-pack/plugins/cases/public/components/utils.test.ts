/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionTypeRegistryMock } from '../../../triggers_actions_ui/public/application/action_type_registry.mock';
import { triggersActionsUiMock } from '../../../triggers_actions_ui/public/mocks';
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
    };

    it('returns false if the connector is not defined', () => {
      expect(isDeprecatedConnector()).toBe(false);
    });

    it('returns false if the connector is not ITSM or SecOps', () => {
      expect(isDeprecatedConnector(connector)).toBe(false);
    });

    it('returns false if the connector is .servicenow and the usesTableApi=false', () => {
      expect(isDeprecatedConnector({ ...connector, actionTypeId: '.servicenow' })).toBe(false);
    });

    it('returns false if the connector is .servicenow-sir and the usesTableApi=false', () => {
      expect(isDeprecatedConnector({ ...connector, actionTypeId: '.servicenow-sir' })).toBe(false);
    });

    it('returns true if the connector is .servicenow and the usesTableApi=true', () => {
      expect(
        isDeprecatedConnector({
          ...connector,
          actionTypeId: '.servicenow',
          config: { usesTableApi: true },
        })
      ).toBe(true);
    });

    it('returns true if the connector is .servicenow-sir and the usesTableApi=true', () => {
      expect(
        isDeprecatedConnector({
          ...connector,
          actionTypeId: '.servicenow-sir',
          config: { usesTableApi: true },
        })
      ).toBe(true);
    });
  });
});
