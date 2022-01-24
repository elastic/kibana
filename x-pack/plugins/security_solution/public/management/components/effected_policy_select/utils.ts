/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PolicyData } from '../../../../common/endpoint/types';
import { EffectedPolicySelection } from './effected_policy_select';
import { GLOBAL_ARTIFACT_TAG } from '../../../../common/endpoint/service/artifacts/constants';

/**
 * Given a list of artifact tags, returns the tags that are not policy tags
 * policy tags follow the format: `policy:id`
 */
export function getArtifactTagsWithoutPolicies(tags?: string[]): string[] {
  return tags?.filter((tag) => !tag.startsWith('policy:')) || [];
}

/**
 * Return a list of artifact policy tags based on a current
 * selection by the EffectedPolicySelection component.
 */
export function getArtifactTagsByEffectedPolicySelection(
  selection: EffectedPolicySelection,
  otherTags: string[] = []
): string[] {
  if (selection.isGlobal) {
    return [GLOBAL_ARTIFACT_TAG, ...otherTags];
  }
  const newTags = selection.selected.map((policy) => {
    return `policy:${policy.id}`;
  });

  return newTags.concat(otherTags);
}

/**
 * Given a list of an Exception item tags it will return
 * the parsed policies from it.
 *
 * Policy tags follow the pattern `policy:id`
 * non policy tags will be ignored.
 */
export function getEffectedPolicySelectionByTags(
  tags: string[],
  policies: PolicyData[]
): EffectedPolicySelection {
  if (tags.find((tag) => tag === GLOBAL_ARTIFACT_TAG)) {
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
  return tags !== undefined && tags.find((tag) => tag === GLOBAL_ARTIFACT_TAG) !== undefined;
}

/**
 * Given an array of an artifact tags, return the ids of policies inside
 * those tags. It will only return tags starting with `policy:` and it will
 * return them without the suffix
 */
export function getArtifactPoliciesIdByTag(tags: string[] = []): string[] {
  return tags.filter((tag) => tag.startsWith('policy:')).map((tag) => tag.substring(7));
}
