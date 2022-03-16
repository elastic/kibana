/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { BY_POLICY_ARTIFACT_TAG_PREFIX, GLOBAL_ARTIFACT_TAG } from './constants';
import {
  createExceptionListItemForCreate,
  getPolicyIdsFromArtifact,
  isArtifactByPolicy,
  isArtifactGlobal,
} from './utils';

describe('Endpoint artifact utilities', () => {
  let globalEntry: Pick<ExceptionListItemSchema, 'tags'>;
  let perPolicyWithPolicy: Pick<ExceptionListItemSchema, 'tags'>;
  let perPolicyNoPolicies: Pick<ExceptionListItemSchema, 'tags'>;

  beforeEach(() => {
    globalEntry = {
      tags: [GLOBAL_ARTIFACT_TAG],
    };

    perPolicyWithPolicy = {
      tags: [`${BY_POLICY_ARTIFACT_TAG_PREFIX}123`, `${BY_POLICY_ARTIFACT_TAG_PREFIX}456`],
    };

    perPolicyNoPolicies = {
      tags: [],
    };
  });

  describe('when using `isArtifactGlobal()', () => {
    it('should return `true` if artifact is global', () => {
      expect(isArtifactGlobal(globalEntry)).toBe(true);
    });

    it('should return `false` if artifact is per-policy', () => {
      expect(isArtifactGlobal(perPolicyWithPolicy)).toBe(false);
    });

    it('should return `false` if artifact is per-policy but not assigned to any policy', () => {
      expect(isArtifactGlobal(perPolicyNoPolicies)).toBe(false);
    });
  });

  describe('when using `isArtifactByPolicy()', () => {
    it('should return `true` if artifact is per-policy', () => {
      expect(isArtifactByPolicy(perPolicyWithPolicy)).toBe(true);
    });

    it('should return `true` if artifact is per-policy but not assigned to any policy', () => {
      expect(isArtifactByPolicy(perPolicyNoPolicies)).toBe(true);
    });

    it('should return `false` if artifact is global', () => {
      expect(isArtifactByPolicy(globalEntry)).toBe(false);
    });
  });

  describe('when using `getPolicyIdsFromArtifact()`', () => {
    it('should return array of policies', () => {
      expect(getPolicyIdsFromArtifact(perPolicyWithPolicy)).toEqual(['123', '456']);
    });

    it('should return empty array if there are none', () => {
      expect(getPolicyIdsFromArtifact(perPolicyNoPolicies)).toEqual([]);
    });
  });

  describe('when using `createExceptionListItemForCreate()`', () => {
    it('should return an empty exception list ready for create', () => {
      expect(createExceptionListItemForCreate('abc')).toEqual({
        comments: [],
        description: '',
        entries: [],
        item_id: undefined,
        list_id: 'abc',
        meta: {
          temporaryUuid: expect.any(String),
        },
        name: '',
        namespace_type: 'agnostic',
        tags: [GLOBAL_ARTIFACT_TAG],
        type: 'simple',
        os_types: ['windows'],
      });
    });
  });
});
