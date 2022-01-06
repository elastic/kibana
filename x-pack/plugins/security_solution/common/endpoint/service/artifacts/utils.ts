/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { BY_POLICY_ARTIFACT_TAG_PREFIX, GLOBAL_ARTIFACT_TAG } from './constants';

const POLICY_ID_START_POSITION = BY_POLICY_ARTIFACT_TAG_PREFIX.length;

export const isArtifactGlobal = (item: ExceptionListItemSchema): boolean => {
  return (item.tags ?? []).find((tag) => tag === GLOBAL_ARTIFACT_TAG) !== undefined;
};

export const isArtifactPerPolicy = (item: ExceptionListItemSchema): boolean => {
  return !isArtifactGlobal(item);
};

export const getPolicyIdsFromArtifact = (item: ExceptionListItemSchema): string[] => {
  const policyIds = [];
  const tags = item.tags ?? [];

  for (const tag of tags) {
    if (tag.startsWith(BY_POLICY_ARTIFACT_TAG_PREFIX)) {
      policyIds.push(tag.substring(POLICY_ID_START_POSITION));
    }
  }

  return policyIds;
};
