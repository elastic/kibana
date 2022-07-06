/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import {
  getPersistableStateAttachmentTypeRegistry,
  persistableStateAttachmentAttributes,
} from '../attachment_framework/mocks';
import {
  extractAttachmentSOReferences,
  getUniqueReferences,
  injectAttachmentSOReferences,
} from './so_references';
import { SOReferenceExtractor } from './so_reference_extractor';

describe('so_references', () => {
  const soExtractor = new SOReferenceExtractor([
    { path: 'anIdToBeInjected', type: 'test-type', name: 'anIdToBeInjected' },
  ]);
  const persistableStateAttachmentTypeRegistry = getPersistableStateAttachmentTypeRegistry();
  const references = [
    {
      id: 'testRef',
      name: 'myTestReference',
      type: 'test-so',
    },
    { id: '1', name: 'anIdToBeInjected', type: 'test-type' },
  ];

  const persistableStateAttachmentAttributesWithoutInjectedId = omit(
    persistableStateAttachmentAttributes,
    'persistableStateAttachmentState.injectedId'
  );

  describe('getUniqueReferences', () => {
    const refs = [
      // Same name and type. Different id
      { id: '1', name: 'test', type: 'testType' },
      { id: '2', name: 'test', type: 'testType' },
      // Same id and type. Different name
      { id: '1', name: 'test1', type: 'testType' },
      { id: '1', name: 'test2', type: 'testType' },
      // Same id and name. Different type
      { id: '1', name: 'test', type: 'testType1' },
      { id: '1', name: 'test', type: 'testType2' },
      // Same id, name, and type with an item in the duplicates array
      { id: 'dup', name: 'test', type: 'testType' },
    ];

    const duplicates = [{ id: 'dup', name: 'test', type: 'testType' }];

    const refsWithDuplicates = [...refs, ...duplicates];

    it('should return the correct unique references', () => {
      expect(getUniqueReferences(refsWithDuplicates)).toEqual(refs);
    });
  });

  describe('injectAttachmentSOReferences', () => {
    it('should inject the references to the attributes correctly', () => {
      const savedObject = {
        id: 'so-id',
        attributes: persistableStateAttachmentAttributesWithoutInjectedId,
        references,
        version: 'so-version',
        type: 'cases-comments',
      };

      const res = injectAttachmentSOReferences(
        soExtractor,
        savedObject,
        persistableStateAttachmentTypeRegistry
      );

      expect(res).toEqual({
        ...savedObject,
        attributes: {
          ...persistableStateAttachmentAttributes,
          anIdToBeInjected: '1',
        },
      });
    });
  });

  describe('extractAttachmentSOReferences', () => {
    it('should extract the references from the attributes correctly', () => {
      const res = extractAttachmentSOReferences(
        soExtractor,
        // @ts-expect-error
        { anIdToBeInjected: '1', ...persistableStateAttachmentAttributes },
        [],
        persistableStateAttachmentTypeRegistry
      );

      expect(res).toEqual({
        attributes: {
          ...persistableStateAttachmentAttributesWithoutInjectedId,
        },
        references: [
          { id: '1', name: 'anIdToBeInjected', type: 'test-type' },
          {
            id: 'testRef',
            name: 'myTestReference',
            type: 'test-so',
          },
        ],
        didDeleteOperation: false,
      });
    });
  });
});
