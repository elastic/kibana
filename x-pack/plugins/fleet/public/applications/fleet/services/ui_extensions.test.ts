/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { lazy } from 'react';

import {
  IntegrationPolicyEditExtensionComponent,
  UIExtensionRegistrationCallback,
  UIExtensionsStorage,
} from '../types';
import { createExtensionRegistrationCallback } from './ui_extensions';

describe('UI Extension services', () => {
  describe('When using createExtensionRegistrationCallback factory', () => {
    let storage: UIExtensionsStorage;
    let register: UIExtensionRegistrationCallback;

    beforeEach(() => {
      storage = {};
      register = createExtensionRegistrationCallback(storage);
    });

    it('should return a function', () => {
      expect(register).toBeInstanceOf(Function);
    });

    it('should store an extension points', () => {
      const LazyCustomView = lazy<IntegrationPolicyEditExtensionComponent>(async () => {
        return { default: ((() => {}) as unknown) as IntegrationPolicyEditExtensionComponent };
      });
      register({
        type: 'integration-policy',
        view: 'edit',
        integration: 'endpoint',
        component: LazyCustomView,
      });

      expect(storage.endpoint['integration-policy']!.edit).toEqual({
        type: 'integration-policy',
        view: 'edit',
        integration: 'endpoint',
        component: LazyCustomView,
      });
    });

    it('should throw if extension point has already registered', () => {
      const LazyCustomView = lazy<IntegrationPolicyEditExtensionComponent>(async () => {
        return { default: ((() => {}) as unknown) as IntegrationPolicyEditExtensionComponent };
      });
      const LazyCustomView2 = lazy<IntegrationPolicyEditExtensionComponent>(async () => {
        return { default: ((() => {}) as unknown) as IntegrationPolicyEditExtensionComponent };
      });

      register({
        type: 'integration-policy',
        view: 'edit',
        integration: 'endpoint',
        component: LazyCustomView,
      });

      expect(() => {
        register({
          type: 'integration-policy',
          view: 'edit',
          integration: 'endpoint',
          component: LazyCustomView2,
        });
      }).toThrow();

      expect(storage.endpoint['integration-policy']!.edit).toEqual({
        type: 'integration-policy',
        view: 'edit',
        integration: 'endpoint',
        component: LazyCustomView,
      });
    });
  });
});
