/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertNavigationRegistry } from './alert_navigation_registry';
import { AlertType, SanitizedAlert } from '../../common';
import uuid from 'uuid';

beforeEach(() => jest.resetAllMocks());

const mockAlertType = (id: string): AlertType => ({
  id,
  name: id,
  actionGroups: [],
  actionVariables: [],
  defaultActionGroupId: 'default',
  producer: 'alerting',
});

describe('AlertNavigationRegistry', () => {
  function handler(alert: SanitizedAlert, alertType: AlertType) {
    return {};
  }

  describe('has()', () => {
    test('returns false for unregistered consumer  handlers', () => {
      const registry = new AlertNavigationRegistry();
      expect(registry.has('siem', mockAlertType(uuid.v4()))).toEqual(false);
    });

    test('returns false for unregistered alert types handlers', () => {
      const registry = new AlertNavigationRegistry();
      expect(registry.has('siem', mockAlertType('index_threshold'))).toEqual(false);
    });

    test('returns true for registered consumer & alert types handlers', () => {
      const registry = new AlertNavigationRegistry();
      const alertType = mockAlertType('index_threshold');
      registry.register('siem', alertType, handler);
      expect(registry.has('siem', alertType)).toEqual(true);
    });

    test('returns true for registered consumer with default handler', () => {
      const registry = new AlertNavigationRegistry();
      const alertType = mockAlertType('index_threshold');
      registry.registerDefault('siem', handler);
      expect(registry.has('siem', alertType)).toEqual(true);
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
    test('registers a handler by consumer & Alert Type', () => {
      const registry = new AlertNavigationRegistry();
      const alertType = mockAlertType('index_threshold');
      registry.register('siem', alertType, handler);
      expect(registry.has('siem', alertType)).toEqual(true);
    });

    test('allows registeration of multiple handlers for the same consumer', () => {
      const registry = new AlertNavigationRegistry();

      const indexThresholdAlertType = mockAlertType('index_threshold');
      registry.register('siem', indexThresholdAlertType, handler);
      expect(registry.has('siem', indexThresholdAlertType)).toEqual(true);

      const geoAlertType = mockAlertType('geogrid');
      registry.register('siem', geoAlertType, handler);
      expect(registry.has('siem', geoAlertType)).toEqual(true);
    });

    test('allows registeration of multiple handlers for the same Alert Type', () => {
      const registry = new AlertNavigationRegistry();

      const indexThresholdAlertType = mockAlertType('geogrid');
      registry.register('siem', indexThresholdAlertType, handler);
      expect(registry.has('siem', indexThresholdAlertType)).toEqual(true);

      registry.register('apm', indexThresholdAlertType, handler);
      expect(registry.has('apm', indexThresholdAlertType)).toEqual(true);
    });

    test('throws if an existing handler is registered', () => {
      const registry = new AlertNavigationRegistry();
      const alertType = mockAlertType('index_threshold');
      registry.register('siem', alertType, handler);
      expect(() => {
        registry.register('siem', alertType, handler);
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

      const geoAlertType = mockAlertType('geogrid');
      registry.register('siem', geoAlertType, handler);
      expect(registry.has('siem', geoAlertType)).toEqual(true);
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
    test('returns registered handlers by consumer & Alert Type', () => {
      const registry = new AlertNavigationRegistry();

      function indexThresholdHandler(alert: SanitizedAlert, alertType: AlertType) {
        return {};
      }

      const indexThresholdAlertType = mockAlertType('indexThreshold');
      registry.register('siem', indexThresholdAlertType, indexThresholdHandler);
      expect(registry.get('siem', indexThresholdAlertType)).toEqual(indexThresholdHandler);
    });

    test('returns default handlers by consumer when there is no handler for requested alert type', () => {
      const registry = new AlertNavigationRegistry();

      function defaultHandler(alert: SanitizedAlert, alertType: AlertType) {
        return {};
      }

      registry.registerDefault('siem', defaultHandler);
      expect(registry.get('siem', mockAlertType('geogrid'))).toEqual(defaultHandler);
    });

    test('returns default handlers by consumer when there are other alert type handler', () => {
      const registry = new AlertNavigationRegistry();

      registry.register('siem', mockAlertType('indexThreshold'), () => ({}));

      function defaultHandler(alert: SanitizedAlert, alertType: AlertType) {
        return {};
      }

      registry.registerDefault('siem', defaultHandler);
      expect(registry.get('siem', mockAlertType('geogrid'))).toEqual(defaultHandler);
    });

    test('throws if a handler isnt registered', () => {
      const registry = new AlertNavigationRegistry();
      const alertType = mockAlertType('index_threshold');

      expect(() => registry.get('siem', alertType)).toThrowErrorMatchingInlineSnapshot(
        `"Navigation for Alert type \\"index_threshold\\" within \\"siem\\" is not registered."`
      );
    });
  });
});
