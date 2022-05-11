/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertNavigationRegistry } from './alert_navigation_registry';
import { RuleType, RecoveredActionGroup, SanitizedRule } from '../../common';
import uuid from 'uuid';

beforeEach(() => jest.resetAllMocks());

const mockRuleType = (id: string): RuleType => ({
  id,
  name: id,
  actionGroups: [],
  recoveryActionGroup: RecoveredActionGroup,
  actionVariables: {
    context: [],
    state: [],
    params: [],
  },
  defaultActionGroupId: 'default',
  producer: 'alerts',
  minimumLicenseRequired: 'basic',
  isExportable: true,
  enabledInLicense: true,
  authorizedConsumers: { foo: { read: true, all: true } },
});

describe('AlertNavigationRegistry', () => {
  function handler(rule: SanitizedRule) {
    return {};
  }

  describe('has()', () => {
    test('returns false for unregistered consumer  handlers', () => {
      const registry = new AlertNavigationRegistry();
      expect(registry.has('siem', mockRuleType(uuid.v4()))).toEqual(false);
    });

    test('returns false for unregistered rule types handlers', () => {
      const registry = new AlertNavigationRegistry();
      expect(registry.has('siem', mockRuleType('index_threshold'))).toEqual(false);
    });

    test('returns true for registered consumer & rule types handlers', () => {
      const registry = new AlertNavigationRegistry();
      const ruleType = mockRuleType('index_threshold');
      registry.register('siem', ruleType.id, handler);
      expect(registry.has('siem', ruleType)).toEqual(true);
    });

    test('returns true for registered consumer with default handler', () => {
      const registry = new AlertNavigationRegistry();
      const ruleType = mockRuleType('index_threshold');
      registry.registerDefault('siem', handler);
      expect(registry.has('siem', ruleType)).toEqual(true);
    });
  });

  describe('hasDefaultHandler()', () => {
    test('returns false for unregistered consumer  handlers', () => {
      const registry = new AlertNavigationRegistry();
      expect(registry.hasDefaultHandler('siem')).toEqual(false);
    });

    test('returns true for registered consumer handlers', () => {
      const registry = new AlertNavigationRegistry();

      registry.registerDefault('siem', handler);
      expect(registry.hasDefaultHandler('siem')).toEqual(true);
    });
  });

  describe('register()', () => {
    test('registers a handler by consumer & Rule Type', () => {
      const registry = new AlertNavigationRegistry();
      const ruleType = mockRuleType('index_threshold');
      registry.register('siem', ruleType.id, handler);
      expect(registry.has('siem', ruleType)).toEqual(true);
    });

    test('allows registeration of multiple handlers for the same consumer', () => {
      const registry = new AlertNavigationRegistry();

      const indexThresholdAlertType = mockRuleType('index_threshold');
      registry.register('siem', indexThresholdAlertType.id, handler);
      expect(registry.has('siem', indexThresholdAlertType)).toEqual(true);

      const geoRuleType = mockRuleType('geogrid');
      registry.register('siem', geoRuleType.id, handler);
      expect(registry.has('siem', geoRuleType)).toEqual(true);
    });

    test('allows registeration of multiple handlers for the same Rule Type', () => {
      const registry = new AlertNavigationRegistry();

      const indexThresholdRuleType = mockRuleType('geogrid');
      registry.register('siem', indexThresholdRuleType.id, handler);
      expect(registry.has('siem', indexThresholdRuleType)).toEqual(true);

      registry.register('apm', indexThresholdRuleType.id, handler);
      expect(registry.has('apm', indexThresholdRuleType)).toEqual(true);
    });

    test('throws if an existing handler is registered', () => {
      const registry = new AlertNavigationRegistry();
      const ruleType = mockRuleType('index_threshold');
      registry.register('siem', ruleType.id, handler);
      expect(() => {
        registry.register('siem', ruleType.id, handler);
      }).toThrowErrorMatchingInlineSnapshot(
        `"Navigation for Alert type \\"index_threshold\\" within \\"siem\\" is already registered."`
      );
    });
  });

  describe('registerDefault()', () => {
    test('registers a handler by consumer', () => {
      const registry = new AlertNavigationRegistry();
      registry.registerDefault('siem', handler);
      expect(registry.hasDefaultHandler('siem')).toEqual(true);
    });

    test('allows registeration of default and typed handlers for the same consumer', () => {
      const registry = new AlertNavigationRegistry();

      registry.registerDefault('siem', handler);
      expect(registry.hasDefaultHandler('siem')).toEqual(true);

      const geoRuleType = mockRuleType('geogrid');
      registry.register('siem', geoRuleType.id, handler);
      expect(registry.has('siem', geoRuleType)).toEqual(true);
    });

    test('throws if an existing handler is registered', () => {
      const registry = new AlertNavigationRegistry();
      registry.registerDefault('siem', handler);
      expect(() => {
        registry.registerDefault('siem', handler);
      }).toThrowErrorMatchingInlineSnapshot(
        `"Default Navigation within \\"siem\\" is already registered."`
      );
    });
  });

  describe('get()', () => {
    test('returns registered handlers by consumer & Rule Type', () => {
      const registry = new AlertNavigationRegistry();

      function indexThresholdHandler(rule: SanitizedRule) {
        return {};
      }

      const indexThresholdRuleType = mockRuleType('indexThreshold');
      registry.register('siem', indexThresholdRuleType.id, indexThresholdHandler);
      expect(registry.get('siem', indexThresholdRuleType)).toEqual(indexThresholdHandler);
    });

    test('returns default handlers by consumer when there is no handler for requested rule type', () => {
      const registry = new AlertNavigationRegistry();

      function defaultHandler(rule: SanitizedRule) {
        return {};
      }

      registry.registerDefault('siem', defaultHandler);
      expect(registry.get('siem', mockRuleType('geogrid'))).toEqual(defaultHandler);
    });

    test('returns default handlers by consumer when there are other rule type handler', () => {
      const registry = new AlertNavigationRegistry();

      registry.register('siem', mockRuleType('indexThreshold').id, () => ({}));

      function defaultHandler(rule: SanitizedRule) {
        return {};
      }

      registry.registerDefault('siem', defaultHandler);
      expect(registry.get('siem', mockRuleType('geogrid'))).toEqual(defaultHandler);
    });

    test('throws if a handler isnt registered', () => {
      const registry = new AlertNavigationRegistry();
      const ruleType = mockRuleType('index_threshold');

      expect(() => registry.get('siem', ruleType)).toThrowErrorMatchingInlineSnapshot(
        `"Navigation for Alert type \\"index_threshold\\" within \\"siem\\" is not registered."`
      );
    });
  });
});
