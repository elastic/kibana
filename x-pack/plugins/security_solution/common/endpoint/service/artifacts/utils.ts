/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import uuid from 'uuid';
import { BY_POLICY_ARTIFACT_TAG_PREFIX, GLOBAL_ARTIFACT_TAG } from './constants';

const POLICY_ID_START_POSITION = BY_POLICY_ARTIFACT_TAG_PREFIX.length;

export const isArtifactGlobal = (item: Pick<ExceptionListItemSchema, 'tags'>): boolean => {
  return (item.tags ?? []).find((tag) => tag === GLOBAL_ARTIFACT_TAG) !== undefined;
};

export const isArtifactByPolicy = (item: Pick<ExceptionListItemSchema, 'tags'>): boolean => {
  return !isArtifactGlobal(item);
};

export const getPolicyIdsFromArtifact = (item: Pick<ExceptionListItemSchema, 'tags'>): string[] => {
  const policyIds = [];
  const tags = item.tags ?? [];

  for (const tag of tags) {
    if (tag !== GLOBAL_ARTIFACT_TAG && tag.startsWith(BY_POLICY_ARTIFACT_TAG_PREFIX)) {
      policyIds.push(tag.substring(POLICY_ID_START_POSITION));
    }
  }

  return policyIds;
};

export const createExceptionListItemForCreate = (listId: string): CreateExceptionListItemSchema => {
  return {
    comments: [],
    description: '',
    entries: [],
    item_id: undefined,
    list_id: listId,
    meta: {
      temporaryUuid: uuid.v4(),
    },
    name: '',
    namespace_type: 'agnostic',
    tags: [GLOBAL_ARTIFACT_TAG],
    type: 'simple',
    os_types: ['windows'],
  };
};
