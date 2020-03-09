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

  describe('get()', () => {
    test('returns registered handlers by consumer & Alert Type', () => {
      const registry = new AlertNavigationRegistry();

      function indexThresholdHandler(alert: SanitizedAlert, alertType: AlertType) {
        return {};
      }

      const indexThresholdAlertType = mockAlertType('geogrid');
      registry.register('siem', indexThresholdAlertType, indexThresholdHandler);
      expect(registry.get('siem', indexThresholdAlertType)).toEqual(indexThresholdHandler);
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
