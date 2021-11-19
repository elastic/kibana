/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PolicyData } from '../../../../common/endpoint/types';
import { EffectedPolicySelection } from './effected_policy_select';

export const GLOBAL_POLICY_TAG = 'policy:all';

export function getArtifactTagsByEffectedPolicySelection(
  selection: EffectedPolicySelection
): string[] {
  if (selection.isGlobal) {
    return [GLOBAL_POLICY_TAG];
  }
  return selection.selected.map((policy) => {
    return `policy:${policy.id}`;
  });
}

export function getEffectedPolicySelectionByTags(
  tags: string[],
  policies: PolicyData[]
): EffectedPolicySelection {
  if (tags.find((tag) => tag === GLOBAL_POLICY_TAG)) {
    return {
      isGlobal: true,
      selected: [],
    };
  }
  const selected: PolicyData[] = tags.reduce((acc, tag) => {
    // edge case: a left over tag with a non-existed policy
    // will be removed by veryfing the policy exists
    const id = tag.split(':')[1];
    const foundPolicy = policies.find((policy) => policy.id === id);
    if (foundPolicy !== undefined) {
      acc.push(foundPolicy);
    }
    return acc;
  }, [] as PolicyData[]);

  return {
    isGlobal: false,
    selected,
  };
}

export function isGlobalPolicyEffected(tags?: string[]): boolean {
  return tags !== undefined && tags.find((tag) => tag === GLOBAL_POLICY_TAG) !== undefined;
}
