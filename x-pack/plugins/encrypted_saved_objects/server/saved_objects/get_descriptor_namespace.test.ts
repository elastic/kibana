/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsTypeRegistryMock } from '@kbn/core/server/mocks';

import { getDescriptorNamespace } from './get_descriptor_namespace';

describe('getDescriptorNamespace', () => {
  describe('namespace agnostic', () => {
    it('returns undefined', () => {
      const mockBaseTypeRegistry = savedObjectsTypeRegistryMock.create();
      mockBaseTypeRegistry.isSingleNamespace.mockReturnValue(false);
      mockBaseTypeRegistry.isMultiNamespace.mockReturnValue(false);
      mockBaseTypeRegistry.isNamespaceAgnostic.mockReturnValue(true);

      expect(getDescriptorNamespace(mockBaseTypeRegistry, 'globaltype', undefined)).toEqual(
        undefined
      );
      expect(getDescriptorNamespace(mockBaseTypeRegistry, 'globaltype', 'foo-namespace')).toEqual(
        undefined
      );
    });
  });

  describe('multi-namespace', () => {
    it('returns undefined', () => {
      const mockBaseTypeRegistry = savedObjectsTypeRegistryMock.create();
      mockBaseTypeRegistry.isSingleNamespace.mockReturnValue(false);
      mockBaseTypeRegistry.isMultiNamespace.mockReturnValue(true);
      mockBaseTypeRegistry.isNamespaceAgnostic.mockReturnValue(false);

      expect(getDescriptorNamespace(mockBaseTypeRegistry, 'sharedtype', undefined)).toEqual(
        undefined
      );
      expect(getDescriptorNamespace(mockBaseTypeRegistry, 'sharedtype', 'foo-namespace')).toEqual(
        undefined
      );
    });
  });

  describe('single namespace', () => {
    it('returns `undefined` if provided namespace is undefined or `default`', () => {
      const mockBaseTypeRegistry = savedObjectsTypeRegistryMock.create();
      mockBaseTypeRegistry.isSingleNamespace.mockReturnValue(true);
      mockBaseTypeRegistry.isMultiNamespace.mockReturnValue(false);
      mockBaseTypeRegistry.isNamespaceAgnostic.mockReturnValue(false);

      expect(getDescriptorNamespace(mockBaseTypeRegistry, 'singletype', undefined)).toEqual(
        undefined
      );

      expect(getDescriptorNamespace(mockBaseTypeRegistry, 'singletype', 'default')).toEqual(
        undefined
      );
    });

    it('returns the provided namespace', () => {
      const mockBaseTypeRegistry = savedObjectsTypeRegistryMock.create();
      mockBaseTypeRegistry.isSingleNamespace.mockReturnValue(true);
      mockBaseTypeRegistry.isMultiNamespace.mockReturnValue(false);
      mockBaseTypeRegistry.isNamespaceAgnostic.mockReturnValue(false);

      expect(getDescriptorNamespace(mockBaseTypeRegistry, 'singletype', 'foo-namespace')).toEqual(
        'foo-namespace'
      );
    });

    it('returns the provided namespace if it is in array format', () => {
      const mockBaseTypeRegistry = savedObjectsTypeRegistryMock.create();
      mockBaseTypeRegistry.isSingleNamespace.mockReturnValue(true);
      mockBaseTypeRegistry.isMultiNamespace.mockReturnValue(false);
      mockBaseTypeRegistry.isNamespaceAgnostic.mockReturnValue(false);

      expect(getDescriptorNamespace(mockBaseTypeRegistry, 'singletype', ['foo-namespace'])).toEqual(
        'foo-namespace'
      );
    });
  });
});
