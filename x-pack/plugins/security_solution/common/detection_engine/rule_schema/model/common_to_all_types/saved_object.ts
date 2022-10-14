/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

/**
 * TODO: https://github.com/elastic/kibana/pull/142950 Add description
 * Outcome is a property of the saved object resolve api
 * will tell us info about the rule after 8.0 migrations
 */
export type SavedObjectResolveOutcome = t.TypeOf<typeof SavedObjectResolveOutcome>;
export const SavedObjectResolveOutcome = t.union([
  t.literal('exactMatch'),
  t.literal('aliasMatch'),
  t.literal('conflict'),
]);

/**
 * TODO: https://github.com/elastic/kibana/pull/142950 Add description
 */
export type SavedObjectResolveAliasTargetId = t.TypeOf<typeof SavedObjectResolveAliasTargetId>;
export const SavedObjectResolveAliasTargetId = t.string;

/**
 * TODO: https://github.com/elastic/kibana/pull/142950 Add description
 */
export type SavedObjectResolveAliasPurpose = t.TypeOf<typeof SavedObjectResolveAliasPurpose>;
export const SavedObjectResolveAliasPurpose = t.union([
  t.literal('savedObjectConversion'),
  t.literal('savedObjectImport'),
]);
