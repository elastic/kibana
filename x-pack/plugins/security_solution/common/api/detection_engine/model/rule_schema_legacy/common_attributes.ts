/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { listArray } from '@kbn/securitysolution-io-ts-list-types';
import { NonEmptyString, version, UUID, NonEmptyArray } from '@kbn/securitysolution-io-ts-types';
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
export const RuleMetadata = t.UnknownRecord; // should be a more specific type?

export type RuleLicense = t.TypeOf<typeof RuleLicense>;
export const RuleLicense = t.string;

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

export type RuleNameOverride = t.TypeOf<typeof RuleNameOverride>;
export const RuleNameOverride = t.string; // should be non-empty string?

export type TimestampOverride = t.TypeOf<typeof TimestampOverride>;
export const TimestampOverride = t.string; // should be non-empty string?

export type TimestampOverrideFallbackDisabled = t.TypeOf<typeof TimestampOverrideFallbackDisabled>;
export const TimestampOverrideFallbackDisabled = t.boolean;

/**
 * Almost all types of Security rules check source event documents for a match to some kind of
 * query or filter. If a document has certain field with certain values, then it's a match and
 * the rule will generate an alert.
 *
 * Required field is an event field that must be present in the source indices of a given rule.
 *
 * @example
 * const standardEcsField: RequiredField = {
 *   name: 'event.action',
 *   type: 'keyword',
 *   ecs: true,
 * };
 *
 * @example
 * const nonEcsField: RequiredField = {
 *   name: 'winlog.event_data.AttributeLDAPDisplayName',
 *   type: 'keyword',
 *   ecs: false,
 * };
 */
export type RequiredField = t.TypeOf<typeof RequiredField>;
export const RequiredField = t.exact(
  t.type({
    name: NonEmptyString,
    type: NonEmptyString,
    ecs: t.boolean,
  })
);

/**
 * Array of event fields that must be present in the source indices of a given rule.
 *
 * @example
 * const x: RequiredFieldArray = [
 *   {
 *     name: 'event.action',
 *     type: 'keyword',
 *     ecs: true,
 *   },
 *   {
 *     name: 'event.code',
 *     type: 'keyword',
 *     ecs: true,
 *   },
 *   {
 *     name: 'winlog.event_data.AttributeLDAPDisplayName',
 *     type: 'keyword',
 *     ecs: false,
 *   },
 * ];
 */
export type RequiredFieldArray = t.TypeOf<typeof RequiredFieldArray>;
export const RequiredFieldArray = t.array(RequiredField);

export type TimelineTemplateId = t.TypeOf<typeof TimelineTemplateId>;
export const TimelineTemplateId = t.string; // should be non-empty string?

export type TimelineTemplateTitle = t.TypeOf<typeof TimelineTemplateTitle>;
export const TimelineTemplateTitle = t.string; // should be non-empty string?

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

/**
 * Related integration is a potential dependency of a rule. It's assumed that if the user installs
 * one of the related integrations of a rule, the rule might start to work properly because it will
 * have source events (generated by this integration) potentially matching the rule's query.
 *
 *   NOTE: Proper work is not guaranteed, because a related integration, if installed, can be
 *   configured differently or generate data that is not necessarily relevant for this rule.
 *
 * Related integration is a combination of a Fleet package and (optionally) one of the
 * package's "integrations" that this package contains. It is represented by 3 properties:
 *
 *   - `package`: name of the package (required, unique id)
 *   - `version`: version of the package (required, semver-compatible)
 *   - `integration`: name of the integration of this package (optional, id within the package)
 *
 * There are Fleet packages like `windows` that contain only one integration; in this case,
 * `integration` should be unspecified. There are also packages like `aws` and `azure` that contain
 * several integrations; in this case, `integration` should be specified.
 *
 * @example
 * const x: RelatedIntegration = {
 *   package: 'windows',
 *   version: '1.5.x',
 * };
 *
 * @example
 * const x: RelatedIntegration = {
 *   package: 'azure',
 *   version: '~1.1.6',
 *   integration: 'activitylogs',
 * };
 */
export type RelatedIntegration = t.TypeOf<typeof RelatedIntegration>;
export const RelatedIntegration = t.exact(
  t.intersection([
    t.type({
      package: NonEmptyString,
      version: NonEmptyString,
    }),
    t.partial({
      integration: NonEmptyString,
    }),
  ])
);

/**
 * Array of related integrations.
 *
 * @example
 * const x: RelatedIntegrationArray = [
 *   {
 *     package: 'windows',
 *     version: '1.5.x',
 *   },
 *   {
 *     package: 'azure',
 *     version: '~1.1.6',
 *     integration: 'activitylogs',
 *   },
 * ];
 */
export type RelatedIntegrationArray = t.TypeOf<typeof RelatedIntegrationArray>;
export const RelatedIntegrationArray = t.array(RelatedIntegration);

/**
 * Schema for fields relating to investigation fields, these are user defined fields we use to highlight
 * in various features in the UI such as alert details flyout and exceptions auto-population from alert.
 * Added in PR #163235
 * Right now we only have a single field but anticipate adding more related fields to store various
 * configuration states such as `override` - where a user might say if they want only these fields to
 * display, or if they want these fields + the fields we select. When expanding this field, it may look
 * something like:
 * export const investigationFields = t.intersection([
 * t.exact(
 *   t.type({
 *     field_names: NonEmptyArray(NonEmptyString),
 *   })
 * ),
 * t.exact(
 *   t.partial({
 *     overide: t.boolean,
 *   })
 * ),
 * ]);
 *
 */
export type InvestigationFields = t.TypeOf<typeof InvestigationFields>;
export const InvestigationFields = t.exact(
  t.type({
    field_names: NonEmptyArray(NonEmptyString),
  })
);
