/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { listArray } from '@kbn/securitysolution-io-ts-list-types';
import { NonEmptyString, version, UUID } from '@kbn/securitysolution-io-ts-types';
import { max_signals, threat } from '@kbn/securitysolution-io-ts-alerting-types';

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

export type RuleDescription = t.TypeOf<typeof RuleDescription>;
export const RuleDescription = NonEmptyString;

export type RuleVersion = t.TypeOf<typeof RuleVersion>;
export const RuleVersion = version;

export type IsRuleImmutable = t.TypeOf<typeof IsRuleImmutable>;
export const IsRuleImmutable = t.boolean;

export type IsRuleEnabled = t.TypeOf<typeof IsRuleEnabled>;
export const IsRuleEnabled = t.boolean;

export type RuleTagArray = t.TypeOf<typeof RuleTagArray>;
export const RuleTagArray = t.array(t.string); // should be non-empty strings?

/**
 * Note that this is a non-exact io-ts type as we allow extra meta information
 * to be added to the meta object
 */
export type RuleMetadata = t.TypeOf<typeof RuleMetadata>;
export const RuleMetadata = t.object; // should be a more specific type?

export type RuleLicense = t.TypeOf<typeof RuleLicense>;
export const RuleLicense = t.string; // should be non-empty string?

export type RuleAuthorArray = t.TypeOf<typeof RuleAuthorArray>;
export const RuleAuthorArray = t.array(t.string); // should be non-empty strings?

export type RuleFalsePositiveArray = t.TypeOf<typeof RuleFalsePositiveArray>;
export const RuleFalsePositiveArray = t.array(t.string); // should be non-empty strings?

export type RuleReferenceArray = t.TypeOf<typeof RuleReferenceArray>;
export const RuleReferenceArray = t.array(t.string); // should be non-empty strings?

export type InvestigationGuide = t.TypeOf<typeof InvestigationGuide>;
export const InvestigationGuide = t.string;

/**
 * Any instructions for the user for setting up their environment in order to start receiving
 * source events for a given rule.
 *
 * It's a multiline text. Markdown is supported.
 */
export type SetupGuide = t.TypeOf<typeof SetupGuide>;
export const SetupGuide = t.string;

export type BuildingBlockType = t.TypeOf<typeof BuildingBlockType>;
export const BuildingBlockType = t.string;

export type AlertsIndex = t.TypeOf<typeof AlertsIndex>;
export const AlertsIndex = t.string;

export type AlertsIndexNamespace = t.TypeOf<typeof AlertsIndexNamespace>;
export const AlertsIndexNamespace = t.string;

export type ExceptionListArray = t.TypeOf<typeof ExceptionListArray>;
export const ExceptionListArray = listArray;

export type MaxSignals = t.TypeOf<typeof MaxSignals>;
export const MaxSignals = max_signals;

export type ThreatArray = t.TypeOf<typeof ThreatArray>;
export const ThreatArray = t.array(threat);

export type IndexPatternArray = t.TypeOf<typeof IndexPatternArray>;
export const IndexPatternArray = t.array(t.string);

export type DataViewId = t.TypeOf<typeof DataViewId>;
export const DataViewId = t.string;

export type RuleQuery = t.TypeOf<typeof RuleQuery>;
export const RuleQuery = t.string;

/**
 * TODO: Right now the filters is an "unknown", when it could more than likely
 * become the actual ESFilter as a type.
 */
export type RuleFilterArray = t.TypeOf<typeof RuleFilterArray>; // Filters are not easily type-able yet
export const RuleFilterArray = t.array(t.unknown); // Filters are not easily type-able yet
