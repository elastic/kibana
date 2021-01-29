/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { lazy } from 'react';

import {
  PackagePolicyEditExtensionComponent,
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
      const LazyCustomView = lazy<PackagePolicyEditExtensionComponent>(async () => {
        return { default: ((() => {}) as unknown) as PackagePolicyEditExtensionComponent };
      });
      register({
        view: 'package-policy-edit',
        package: 'endpoint',
        component: LazyCustomView,
      });

      expect(storage.endpoint['package-policy-edit']).toEqual({
        view: 'package-policy-edit',
        package: 'endpoint',
        component: LazyCustomView,
      });
    });

    it('should throw if extension point has already registered', () => {
      const LazyCustomView = lazy<PackagePolicyEditExtensionComponent>(async () => {
        return { default: ((() => {}) as unknown) as PackagePolicyEditExtensionComponent };
      });
      const LazyCustomView2 = lazy<PackagePolicyEditExtensionComponent>(async () => {
        return { default: ((() => {}) as unknown) as PackagePolicyEditExtensionComponent };
      });

      register({
        view: 'package-policy-edit',
        package: 'endpoint',
        component: LazyCustomView,
      });

      expect(() => {
        register({
          view: 'package-policy-edit',
          package: 'endpoint',
          component: LazyCustomView2,
        });
      }).toThrow();

      expect(storage.endpoint['package-policy-edit']).toEqual({
        view: 'package-policy-edit',
        package: 'endpoint',
        component: LazyCustomView,
      });
    });
  });
});
