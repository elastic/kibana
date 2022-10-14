/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { NonEmptyString, version, UUID } from '@kbn/securitysolution-io-ts-types';

/**
 * TODO: https://github.com/elastic/kibana/pull/142950 Add description
 */
export type RuleObjectId = t.TypeOf<typeof RuleObjectId>;
export const RuleObjectId = UUID;

/**
 * TODO: https://github.com/elastic/kibana/pull/142950 Add description
 *
 * NOTE: Never make this a strict uuid, we allow the rule_id to be any string at the moment
 * in case we encounter 3rd party rule systems which might be using auto incrementing numbers
 * or other different things.
 */
export type RuleSignatureId = t.TypeOf<typeof RuleSignatureId>;
export const RuleSignatureId = t.string; // should be non-empty string?

/**
 * TODO: https://github.com/elastic/kibana/pull/142950 Add description
 */
export type RuleName = t.TypeOf<typeof RuleName>;
export const RuleName = NonEmptyString;

/**
 * TODO: https://github.com/elastic/kibana/pull/142950 Add description
 */
export type RuleDescription = t.TypeOf<typeof RuleDescription>;
export const RuleDescription = NonEmptyString;

/**
 * TODO: https://github.com/elastic/kibana/pull/142950 Add description
 */
export type RuleVersion = t.TypeOf<typeof RuleVersion>;
export const RuleVersion = version;

/**
 * TODO: https://github.com/elastic/kibana/pull/142950 Add description
 */
export type RuleTagArray = t.TypeOf<typeof RuleTagArray>;
export const RuleTagArray = t.array(t.string); // should be non-empty strings?

/**
 * TODO: https://github.com/elastic/kibana/pull/142950 Add description
 * Note that this is a non-exact io-ts type as we allow extra meta information
 * to be added to the meta object
 */
export type RuleMetadata = t.TypeOf<typeof RuleMetadata>;
export const RuleMetadata = t.object; // should be a more specific type?

/**
 * TODO: https://github.com/elastic/kibana/pull/142950 Add description
 */
export type IsRuleImmutable = t.TypeOf<typeof IsRuleImmutable>;
export const IsRuleImmutable = t.boolean;

/**
 * TODO: https://github.com/elastic/kibana/pull/142950 Add description
 */
export type IsRuleEnabled = t.TypeOf<typeof IsRuleEnabled>;
export const IsRuleEnabled = t.boolean;
