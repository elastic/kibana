/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EffectScope } from '../../types';
import { BY_POLICY_ARTIFACT_TAG_PREFIX } from '../artifacts/constants';

/**
 * Looks at an array of `tags` (attributed defined on the `ExceptionListItemSchema`) and returns back
 * the `EffectScope` of based on the data in the array
 * @param tags
 */
export const tagsToEffectScope = (tags: string[]): EffectScope => {
  const policyReferenceTags = tags.filter((tag) => tag.startsWith(BY_POLICY_ARTIFACT_TAG_PREFIX));

  if (policyReferenceTags.some((tag) => tag === `${BY_POLICY_ARTIFACT_TAG_PREFIX}all`)) {
    return {
      type: 'global',
    };
  } else {
    return {
      type: 'policy',
      policies: policyReferenceTags.map((tag) => tag.substr(BY_POLICY_ARTIFACT_TAG_PREFIX.length)),
    };
  }
};
