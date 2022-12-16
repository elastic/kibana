/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as t from 'io-ts';
import { NonEmptyString } from '@kbn/securitysolution-io-ts-types';
import type { RuleVersion } from '../../../rule_schema';

/**
 * Type that should match the `version` field type of Elasticsearch.
 * https://www.elastic.co/guide/en/elasticsearch/reference/current/version.html
 */
export type SemanticVersion = t.TypeOf<typeof SemanticVersion>;
export const SemanticVersion = NonEmptyString;

export const getSemanticVersion = (
  ruleVersion: RuleVersion,
  patchVersion: number
): SemanticVersion => `${ruleVersion}.0.${patchVersion}`;

export const convertLegacyVersionToSemantic = (legacyVersion: RuleVersion): SemanticVersion =>
  getSemanticVersion(legacyVersion, 0);

export const convertSemanticVersionToLegacy = (semanticVersion: SemanticVersion): RuleVersion => {
  throw new Error('Not implemented');
};
