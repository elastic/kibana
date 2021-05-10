/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import * as t from 'io-ts';
import { Either } from 'fp-ts/lib/Either';

import {
  SavedObjectAttributes,
  SavedObjectAttribute,
  SavedObjectAttributeSingle,
} from 'src/core/types';
import { RiskScore } from '../types/risk_score';
import { UUID } from '../types/uuid';
import { IsoDateString } from '../types/iso_date_string';
import { PositiveIntegerGreaterThanZero } from '../types/positive_integer_greater_than_zero';
import { PositiveInteger } from '../types/positive_integer';
import { NonEmptyString } from '../types/non_empty_string';
import { parseScheduleDates } from '../../parse_schedule_dates';
import { machine_learning_job_id_normalized } from '../types/normalized_ml_job_id';

export const author = t.array(t.string);
export type Author = t.TypeOf<typeof author>;

export const authorOrUndefined = t.union([author, t.undefined]);
export type AuthorOrUndefined = t.TypeOf<typeof authorOrUndefined>;

export const building_block_type = t.string;
export type BuildingBlockType = t.TypeOf<typeof building_block_type>;

export const buildingBlockTypeOrUndefined = t.union([building_block_type, t.undefined]);
export type BuildingBlockTypeOrUndefined = t.TypeOf<typeof buildingBlockTypeOrUndefined>;

export const description = NonEmptyString;
export type Description = t.TypeOf<typeof description>;

export const descriptionOrUndefined = t.union([description, t.undefined]);
export type DescriptionOrUndefined = t.TypeOf<typeof descriptionOrUndefined>;

export const enabled = t.boolean;
export type Enabled = t.TypeOf<typeof enabled>;

export const enabledOrUndefined = t.union([enabled, t.undefined]);
export type EnabledOrUndefined = t.TypeOf<typeof enabledOrUndefined>;

export const event_category_override = t.string;
export type EventCategoryOverride = t.TypeOf<typeof event_category_override>;

export const eventCategoryOverrideOrUndefined = t.union([event_category_override, t.undefined]);
export type EventCategoryOverrideOrUndefined = t.TypeOf<typeof eventCategoryOverrideOrUndefined>;

export const false_positives = t.array(t.string);
export type FalsePositives = t.TypeOf<typeof false_positives>;

export const falsePositivesOrUndefined = t.union([false_positives, t.undefined]);
export type FalsePositivesOrUndefined = t.TypeOf<typeof falsePositivesOrUndefined>;

export const file_name = t.string;
export type FileName = t.TypeOf<typeof file_name>;

export const exclude_export_details = t.boolean;
export type ExcludeExportDetails = t.TypeOf<typeof exclude_export_details>;

/**
 * TODO: Right now the filters is an "unknown", when it could more than likely
 * become the actual ESFilter as a type.
 */
export const filters = t.array(t.unknown); // Filters are not easily type-able yet
export type Filters = t.TypeOf<typeof filters>; // Filters are not easily type-able yet

export const filtersOrUndefined = t.union([filters, t.undefined]);
export type FiltersOrUndefined = t.TypeOf<typeof filtersOrUndefined>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const saved_object_attribute_single: t.Type<SavedObjectAttributeSingle> = t.recursion(
  'saved_object_attribute_single',
  () => t.union([t.string, t.number, t.boolean, t.null, t.undefined, saved_object_attributes])
);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const saved_object_attribute: t.Type<SavedObjectAttribute> = t.recursion(
  'saved_object_attribute',
  () => t.union([saved_object_attribute_single, t.array(saved_object_attribute_single)])
);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const saved_object_attributes: t.Type<SavedObjectAttributes> = t.recursion(
  'saved_object_attributes',
  () => t.record(t.string, saved_object_attribute)
);

/**
 * Params is an "object", since it is a type of AlertActionParams which is action templates.
 * @see x-pack/plugins/alerting/common/alert.ts
 */
export const action_group = t.string;
export const action_id = t.string;
export const action_action_type_id = t.string;
export const action_params = saved_object_attributes;
export const action = t.exact(
  t.type({
    group: action_group,
    id: action_id,
    action_type_id: action_action_type_id,
    params: action_params,
  })
);

export const actions = t.array(action);
export type Actions = t.TypeOf<typeof actions>;

export const actionsCamel = t.array(
  t.exact(
    t.type({
      group: action_group,
      id: action_id,
      actionTypeId: action_action_type_id,
      params: action_params,
    })
  )
);
export type ActionsCamel = t.TypeOf<typeof actions>;

const stringValidator = (input: unknown): input is string => typeof input === 'string';
export const from = new t.Type<string, string, unknown>(
  'From',
  t.string.is,
  (input, context): Either<t.Errors, string> => {
    if (stringValidator(input) && parseScheduleDates(input) == null) {
      return t.failure(input, context, 'Failed to parse "from" on rule param');
    }
    return t.string.validate(input, context);
  },
  t.identity
);
export type From = t.TypeOf<typeof from>;

export const fromOrUndefined = t.union([from, t.undefined]);
export type FromOrUndefined = t.TypeOf<typeof fromOrUndefined>;

export const immutable = t.boolean;
export type Immutable = t.TypeOf<typeof immutable>;

// Note: Never make this a strict uuid, we allow the rule_id to be any string at the moment
// in case we encounter 3rd party rule systems which might be using auto incrementing numbers
// or other different things.
export const rule_id = t.string;
export type RuleId = t.TypeOf<typeof rule_id>;

export const ruleIdOrUndefined = t.union([rule_id, t.undefined]);
export type RuleIdOrUndefined = t.TypeOf<typeof ruleIdOrUndefined>;

export const id = UUID;
export const idOrUndefined = t.union([id, t.undefined]);
export type IdOrUndefined = t.TypeOf<typeof idOrUndefined>;

export const index = t.array(t.string);
export type Index = t.TypeOf<typeof index>;

export const indexOrUndefined = t.union([index, t.undefined]);
export type IndexOrUndefined = t.TypeOf<typeof indexOrUndefined>;

export const interval = t.string;
export type Interval = t.TypeOf<typeof interval>;

export const intervalOrUndefined = t.union([interval, t.undefined]);
export type IntervalOrUndefined = t.TypeOf<typeof intervalOrUndefined>;

export const query = t.string;
export type Query = t.TypeOf<typeof query>;

export const queryOrUndefined = t.union([query, t.undefined]);
export type QueryOrUndefined = t.TypeOf<typeof queryOrUndefined>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const language = t.keyof({ eql: null, kuery: null, lucene: null });

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type Language = t.TypeOf<typeof language>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const languageOrUndefined = t.union([language, t.undefined]);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type LanguageOrUndefined = t.TypeOf<typeof languageOrUndefined>;

export const license = t.string;
export type License = t.TypeOf<typeof license>;

export const licenseOrUndefined = t.union([license, t.undefined]);
export type LicenseOrUndefined = t.TypeOf<typeof licenseOrUndefined>;

export const objects = t.array(t.type({ rule_id }));

export const output_index = t.string;
export type OutputIndex = t.TypeOf<typeof output_index>;

export const outputIndexOrUndefined = t.union([output_index, t.undefined]);
export type OutputIndexOrUndefined = t.TypeOf<typeof outputIndexOrUndefined>;

export const saved_id = t.string;
export type SavedId = t.TypeOf<typeof saved_id>;

export const savedIdOrUndefined = t.union([saved_id, t.undefined]);
export type SavedIdOrUndefined = t.TypeOf<typeof savedIdOrUndefined>;

export const timeline_id = t.string;
export type TimelineId = t.TypeOf<typeof timeline_id>;

export const timelineIdOrUndefined = t.union([timeline_id, t.undefined]);
export type TimelineIdOrUndefined = t.TypeOf<typeof timelineIdOrUndefined>;

export const timeline_title = t.string;
export type TimelineTitle = t.TypeOf<typeof t.string>;

export const timelineTitleOrUndefined = t.union([timeline_title, t.undefined]);
export type TimelineTitleOrUndefined = t.TypeOf<typeof timelineTitleOrUndefined>;

export const timestamp_override = t.string;
export type TimestampOverride = t.TypeOf<typeof timestamp_override>;

export const timestampOverrideOrUndefined = t.union([timestamp_override, t.undefined]);
export type TimestampOverrideOrUndefined = t.TypeOf<typeof timestampOverrideOrUndefined>;

export const throttle = t.string;
export type Throttle = t.TypeOf<typeof throttle>;

export const throttleOrNull = t.union([throttle, t.null]);
export type ThrottleOrNull = t.TypeOf<typeof throttleOrNull>;

export const throttleOrNullOrUndefined = t.union([throttle, t.null, t.undefined]);
export type ThrottleOrUndefinedOrNull = t.TypeOf<typeof throttleOrNullOrUndefined>;

export const anomaly_threshold = PositiveInteger;
export type AnomalyThreshold = t.TypeOf<typeof PositiveInteger>;

export const anomalyThresholdOrUndefined = t.union([anomaly_threshold, t.undefined]);
export type AnomalyThresholdOrUndefined = t.TypeOf<typeof anomalyThresholdOrUndefined>;

export const machine_learning_job_id = t.union([t.string, machine_learning_job_id_normalized]);
export type MachineLearningJobId = t.TypeOf<typeof machine_learning_job_id>;

export const machineLearningJobIdOrUndefined = t.union([machine_learning_job_id, t.undefined]);
export type MachineLearningJobIdOrUndefined = t.TypeOf<typeof machineLearningJobIdOrUndefined>;

/**
 * Note that this is a non-exact io-ts type as we allow extra meta information
 * to be added to the meta object
 */
export const meta = t.object;
export type Meta = t.TypeOf<typeof meta>;
export const metaOrUndefined = t.union([meta, t.undefined]);
export type MetaOrUndefined = t.TypeOf<typeof metaOrUndefined>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const max_signals = PositiveIntegerGreaterThanZero;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type MaxSignals = t.TypeOf<typeof max_signals>;

export const maxSignalsOrUndefined = t.union([max_signals, t.undefined]);
export type MaxSignalsOrUndefined = t.TypeOf<typeof maxSignalsOrUndefined>;

export const name = NonEmptyString;
export type Name = t.TypeOf<typeof name>;

export const nameOrUndefined = t.union([name, t.undefined]);
export type NameOrUndefined = t.TypeOf<typeof nameOrUndefined>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const operator = t.keyof({
  equals: null,
});

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type Operator = t.TypeOf<typeof operator>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export enum OperatorEnum {
  EQUALS = 'equals',
}

export const risk_score = RiskScore;
export type RiskScore = t.TypeOf<typeof risk_score>;

export const riskScoreOrUndefined = t.union([risk_score, t.undefined]);
export type RiskScoreOrUndefined = t.TypeOf<typeof riskScoreOrUndefined>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const risk_score_mapping_field = t.string;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const risk_score_mapping_value = t.string;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const risk_score_mapping_item = t.exact(
  t.type({
    field: risk_score_mapping_field,
    value: risk_score_mapping_value,
    operator,
    risk_score: riskScoreOrUndefined,
  })
);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const risk_score_mapping = t.array(risk_score_mapping_item);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type RiskScoreMapping = t.TypeOf<typeof risk_score_mapping>;

export const riskScoreMappingOrUndefined = t.union([risk_score_mapping, t.undefined]);
export type RiskScoreMappingOrUndefined = t.TypeOf<typeof riskScoreMappingOrUndefined>;

export const rule_name_override = t.string;
export type RuleNameOverride = t.TypeOf<typeof rule_name_override>;

export const ruleNameOverrideOrUndefined = t.union([rule_name_override, t.undefined]);
export type RuleNameOverrideOrUndefined = t.TypeOf<typeof ruleNameOverrideOrUndefined>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const severity = t.keyof({ low: null, medium: null, high: null, critical: null });

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type Severity = t.TypeOf<typeof severity>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const severityOrUndefined = t.union([severity, t.undefined]);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type SeverityOrUndefined = t.TypeOf<typeof severityOrUndefined>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const severity_mapping_field = t.string;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const severity_mapping_value = t.string;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const severity_mapping_item = t.exact(
  t.type({
    field: severity_mapping_field,
    operator,
    value: severity_mapping_value,
    severity,
  })
);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type SeverityMappingItem = t.TypeOf<typeof severity_mapping_item>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const severity_mapping = t.array(severity_mapping_item);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type SeverityMapping = t.TypeOf<typeof severity_mapping>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const severityMappingOrUndefined = t.union([severity_mapping, t.undefined]);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type SeverityMappingOrUndefined = t.TypeOf<typeof severityMappingOrUndefined>;

export const status = t.keyof({ open: null, closed: null, 'in-progress': null });
export type Status = t.TypeOf<typeof status>;

export const job_status = t.keyof({
  succeeded: null,
  failed: null,
  'going to run': null,
  'partial failure': null,
  warning: null,
});
export type JobStatus = t.TypeOf<typeof job_status>;

export const conflicts = t.keyof({ abort: null, proceed: null });
export type Conflicts = t.TypeOf<typeof conflicts>;

// TODO: Create a regular expression type or custom date math part type here
export const to = t.string;
export type To = t.TypeOf<typeof to>;

export const toOrUndefined = t.union([to, t.undefined]);
export type ToOrUndefined = t.TypeOf<typeof toOrUndefined>;

export const type = t.keyof({
  eql: null,
  machine_learning: null,
  query: null,
  saved_query: null,
  threshold: null,
  threat_match: null,
});
export type Type = t.TypeOf<typeof type>;

export const typeOrUndefined = t.union([type, t.undefined]);
export type TypeOrUndefined = t.TypeOf<typeof typeOrUndefined>;

export const queryFilter = t.string;
export type QueryFilter = t.TypeOf<typeof queryFilter>;

export const queryFilterOrUndefined = t.union([queryFilter, t.undefined]);
export type QueryFilterOrUndefined = t.TypeOf<typeof queryFilterOrUndefined>;

export const references = t.array(t.string);
export type References = t.TypeOf<typeof references>;

export const referencesOrUndefined = t.union([references, t.undefined]);
export type ReferencesOrUndefined = t.TypeOf<typeof referencesOrUndefined>;

export const per_page = PositiveInteger;
export type PerPage = t.TypeOf<typeof per_page>;

export const perPageOrUndefined = t.union([per_page, t.undefined]);
export type PerPageOrUndefined = t.TypeOf<typeof perPageOrUndefined>;

export const page = PositiveIntegerGreaterThanZero;
export type Page = t.TypeOf<typeof page>;

export const pageOrUndefined = t.union([page, t.undefined]);
export type PageOrUndefined = t.TypeOf<typeof pageOrUndefined>;

export const signal_ids = t.array(t.string);
export type SignalIds = t.TypeOf<typeof signal_ids>;

// TODO: Can this be more strict or is this is the set of all Elastic Queries?
export const signal_status_query = t.object;

export const sort_field = t.string;
export type SortField = t.TypeOf<typeof sort_field>;

export const sortFieldOrUndefined = t.union([sort_field, t.undefined]);
export type SortFieldOrUndefined = t.TypeOf<typeof sortFieldOrUndefined>;

export const sort_order = t.keyof({ asc: null, desc: null });
export type SortOrder = t.TypeOf<typeof sort_order>;

export const sortOrderOrUndefined = t.union([sort_order, t.undefined]);
export type SortOrderOrUndefined = t.TypeOf<typeof sortOrderOrUndefined>;

export const tags = t.array(t.string);
export type Tags = t.TypeOf<typeof tags>;

export const tagsOrUndefined = t.union([tags, t.undefined]);
export type TagsOrUndefined = t.TypeOf<typeof tagsOrUndefined>;

export const fields = t.array(t.string);
export type Fields = t.TypeOf<typeof fields>;
export const fieldsOrUndefined = t.union([fields, t.undefined]);
export type FieldsOrUndefined = t.TypeOf<typeof fieldsOrUndefined>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const threat_framework = t.string;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const threat_tactic_id = t.string;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const threat_tactic_name = t.string;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const threat_tactic_reference = t.string;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const threat_tactic = t.type({
  id: threat_tactic_id,
  name: threat_tactic_name,
  reference: threat_tactic_reference,
});

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type ThreatTactic = t.TypeOf<typeof threat_tactic>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const threat_subtechnique_id = t.string;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const threat_subtechnique_name = t.string;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const threat_subtechnique_reference = t.string;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const threat_subtechnique = t.type({
  id: threat_subtechnique_id,
  name: threat_subtechnique_name,
  reference: threat_subtechnique_reference,
});

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type ThreatSubtechnique = t.TypeOf<typeof threat_subtechnique>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const threat_subtechniques = t.array(threat_subtechnique);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const threat_technique_id = t.string;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const threat_technique_name = t.string;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const threat_technique_reference = t.string;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const threat_technique = t.intersection([
  t.exact(
    t.type({
      id: threat_technique_id,
      name: threat_technique_name,
      reference: threat_technique_reference,
    })
  ),
  t.exact(
    t.partial({
      subtechnique: threat_subtechniques,
    })
  ),
]);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type ThreatTechnique = t.TypeOf<typeof threat_technique>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const threat_techniques = t.array(threat_technique);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const threat = t.intersection([
  t.exact(
    t.type({
      framework: threat_framework,
      tactic: threat_tactic,
    })
  ),
  t.exact(
    t.partial({
      technique: threat_techniques,
    })
  ),
]);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type Threat = t.TypeOf<typeof threat>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const threats = t.array(threat);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type Threats = t.TypeOf<typeof threats>;

export const threatsOrUndefined = t.union([threats, t.undefined]);
export type ThreatsOrUndefined = t.TypeOf<typeof threatsOrUndefined>;

export const thresholdField = t.exact(
  t.type({
    field: t.union([t.string, t.array(t.string)]), // Covers pre- and post-7.12
    value: PositiveIntegerGreaterThanZero,
  })
);
export type ThresholdField = t.TypeOf<typeof thresholdField>;

export const thresholdFieldNormalized = t.exact(
  t.type({
    field: t.array(t.string),
    value: PositiveIntegerGreaterThanZero,
  })
);
export type ThresholdFieldNormalized = t.TypeOf<typeof thresholdFieldNormalized>;

export const thresholdCardinalityField = t.exact(
  t.type({
    field: t.string,
    value: PositiveInteger,
  })
);
export type ThresholdCardinalityField = t.TypeOf<typeof thresholdCardinalityField>;

export const threshold = t.intersection([
  thresholdField,
  t.exact(
    t.partial({
      cardinality: t.array(thresholdCardinalityField),
    })
  ),
]);
export type Threshold = t.TypeOf<typeof threshold>;

export const thresholdOrUndefined = t.union([threshold, t.undefined]);
export type ThresholdOrUndefined = t.TypeOf<typeof thresholdOrUndefined>;

export const thresholdNormalized = t.intersection([
  thresholdFieldNormalized,
  t.exact(
    t.partial({
      cardinality: t.array(thresholdCardinalityField),
    })
  ),
]);
export type ThresholdNormalized = t.TypeOf<typeof thresholdNormalized>;

export const thresholdNormalizedOrUndefined = t.union([thresholdNormalized, t.undefined]);
export type ThresholdNormalizedOrUndefined = t.TypeOf<typeof thresholdNormalizedOrUndefined>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const created_at = IsoDateString;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const updated_at = IsoDateString;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const updated_by = t.string;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const created_by = t.string;
export const updatedByOrNull = t.union([updated_by, t.null]);
export type UpdatedByOrNull = t.TypeOf<typeof updatedByOrNull>;
export const createdByOrNull = t.union([created_by, t.null]);
export type CreatedByOrNull = t.TypeOf<typeof createdByOrNull>;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const version = PositiveIntegerGreaterThanZero;

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type Version = t.TypeOf<typeof version>;

export const versionOrUndefined = t.union([version, t.undefined]);
export type VersionOrUndefined = t.TypeOf<typeof versionOrUndefined>;

export const last_success_at = IsoDateString;
export type LastSuccessAt = t.TypeOf<typeof IsoDateString>;

export const last_success_message = t.string;
export type LastSuccessMessage = t.TypeOf<typeof last_success_message>;

export const last_failure_at = IsoDateString;
export type LastFailureAt = t.TypeOf<typeof last_failure_at>;

export const last_failure_message = t.string;
export type LastFailureMessage = t.TypeOf<typeof last_failure_message>;

export const status_date = IsoDateString;
export type StatusDate = t.TypeOf<typeof status_date>;

export const rules_installed = PositiveInteger;
export const rules_updated = PositiveInteger;
export const status_code = PositiveInteger;
export const message = t.string;
export const perPage = PositiveInteger;
export const total = PositiveInteger;
export const success = t.boolean;
export const success_count = PositiveInteger;
export const rules_custom_installed = PositiveInteger;
export const rules_not_installed = PositiveInteger;
export const rules_not_updated = PositiveInteger;

export const timelines_installed = PositiveInteger;
export const timelines_updated = PositiveInteger;
export const timelines_not_installed = PositiveInteger;
export const timelines_not_updated = PositiveInteger;

export const note = t.string;
export type Note = t.TypeOf<typeof note>;

export const noteOrUndefined = t.union([note, t.undefined]);
export type NoteOrUndefined = t.TypeOf<typeof noteOrUndefined>;

export const indexRecord = t.record(
  t.string,
  t.type({
    all: t.boolean,
    maintenance: t.boolean,
    manage_ilm: t.boolean,
    read: t.boolean,
    create_index: t.boolean,
    read_cross_cluster: t.boolean,
    index: t.boolean,
    monitor: t.boolean,
    delete: t.boolean,
    manage: t.boolean,
    delete_index: t.boolean,
    create_doc: t.boolean,
    view_index_metadata: t.boolean,
    create: t.boolean,
    manage_follow_index: t.boolean,
    manage_leader_index: t.boolean,
    write: t.boolean,
  })
);
export type IndexRecord = t.TypeOf<typeof indexRecord>;

export const indexType = t.type({
  index: indexRecord,
});
export type IndexType = t.TypeOf<typeof indexType>;

export const privilege = t.type({
  username: t.string,
  has_all_requested: t.boolean,
  cluster: t.type({
    monitor_ml: t.boolean,
    manage_ccr: t.boolean,
    manage_index_templates: t.boolean,
    monitor_watcher: t.boolean,
    monitor_transform: t.boolean,
    read_ilm: t.boolean,
    manage_security: t.boolean,
    manage_own_api_key: t.boolean,
    manage_saml: t.boolean,
    all: t.boolean,
    manage_ilm: t.boolean,
    manage_ingest_pipelines: t.boolean,
    read_ccr: t.boolean,
    manage_rollup: t.boolean,
    monitor: t.boolean,
    manage_watcher: t.boolean,
    manage: t.boolean,
    manage_transform: t.boolean,
    manage_token: t.boolean,
    manage_ml: t.boolean,
    manage_pipeline: t.boolean,
    monitor_rollup: t.boolean,
    transport_client: t.boolean,
    create_snapshot: t.boolean,
  }),
  index: indexRecord,
  is_authenticated: t.boolean,
  has_encryption_key: t.boolean,
});

export type Privilege = t.TypeOf<typeof privilege>;
