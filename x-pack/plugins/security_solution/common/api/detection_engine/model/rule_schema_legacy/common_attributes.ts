/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { NonEmptyString, UUID } from '@kbn/securitysolution-io-ts-types';

/*
IMPORTANT NOTE ON THIS FILE:

This file contains the remaining rule schema types created manually via io-ts. They have been
migrated to Zod schemas created via code generation out of OpenAPI schemas
(found in x-pack/plugins/security_solution/common/api/detection_engine/model/rule_schema/common_attributes.gen.ts)

The remaining types here couldn't easily be deleted/replaced because they are dependencies in
complex derived schemas in two files:

- x-pack/plugins/security_solution/common/api/detection_engine/rule_exceptions/find_exception_references/find_exception_references_route.ts
- x-pack/plugins/security_solution/common/api/timeline/model/api.ts

Once those two files are migrated to Zod, the /common/api/detection_engine/model/rule_schema_legacy
folder can be removed.
*/

export type RuleObjectId = t.TypeOf<typeof RuleObjectId>;
export const RuleObjectId = UUID;

/**
 * NOTE: Never make this a strict uuid, we allow the rule_id to be any string at the moment
 * in case we encounter 3rd party rule systems which might be using auto incrementing numbers
 * or other different things.
 */
export type RuleSignatureId = t.TypeOf<typeof RuleSignatureId>;
export const RuleSignatureId = t.string; // should be non-empty string?

export type RuleName = t.TypeOf<typeof RuleName>;
export const RuleName = NonEmptyString;

/**
 * Outcome is a property of the saved object resolve api
 * will tell us info about the rule after 8.0 migrations
 */
export type SavedObjectResolveOutcome = t.TypeOf<typeof SavedObjectResolveOutcome>;
export const SavedObjectResolveOutcome = t.union([
  t.literal('exactMatch'),
  t.literal('aliasMatch'),
  t.literal('conflict'),
]);

export type SavedObjectResolveAliasTargetId = t.TypeOf<typeof SavedObjectResolveAliasTargetId>;
export const SavedObjectResolveAliasTargetId = t.string;

export type SavedObjectResolveAliasPurpose = t.TypeOf<typeof SavedObjectResolveAliasPurpose>;
export const SavedObjectResolveAliasPurpose = t.union([
  t.literal('savedObjectConversion'),
  t.literal('savedObjectImport'),
]);
