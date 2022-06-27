/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import {
  IsoDateString,
  NonEmptyString,
  PositiveInteger,
  PositiveIntegerGreaterThanZero,
  UUID,
  LimitedSizeArray,
} from '@kbn/securitysolution-io-ts-types';
import * as t from 'io-ts';

export const author = t.array(t.string);
export type Author = t.TypeOf<typeof author>;

export const building_block_type = t.string;
export type BuildingBlockType = t.TypeOf<typeof building_block_type>;

export const buildingBlockTypeOrUndefined = t.union([building_block_type, t.undefined]);

export const description = NonEmptyString;
export type Description = t.TypeOf<typeof description>;

// outcome is a property of the saved object resolve api
// will tell us info about the rule after 8.0 migrations
export const outcome = t.union([
  t.literal('exactMatch'),
  t.literal('aliasMatch'),
  t.literal('conflict'),
]);
export type Outcome = t.TypeOf<typeof outcome>;

export const alias_target_id = t.string;
export const alias_purpose = t.union([
  t.literal('savedObjectConversion'),
  t.literal('savedObjectImport'),
]);
export const enabled = t.boolean;
export type Enabled = t.TypeOf<typeof enabled>;
export const event_category_override = t.string;
export const eventCategoryOverrideOrUndefined = t.union([event_category_override, t.undefined]);

export const tiebreaker_field = t.string;

export const tiebreakerFieldOrUndefined = t.union([tiebreaker_field, t.undefined]);

export const timestamp_field = t.string;

export const timestampFieldOrUndefined = t.union([timestamp_field, t.undefined]);

export const false_positives = t.array(t.string);

export const file_name = t.string;
export type FileName = t.TypeOf<typeof file_name>;

export const exclude_export_details = t.boolean;
export type ExcludeExportDetails = t.TypeOf<typeof exclude_export_details>;

export const namespace = t.string;
export type Namespace = t.TypeOf<typeof namespace>;

/**
 * TODO: Right now the filters is an "unknown", when it could more than likely
 * become the actual ESFilter as a type.
 */
export const filters = t.array(t.unknown); // Filters are not easily type-able yet
export type Filters = t.TypeOf<typeof filters>; // Filters are not easily type-able yet

export const filtersOrUndefined = t.union([filters, t.undefined]);
export type FiltersOrUndefined = t.TypeOf<typeof filtersOrUndefined>;

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
export type Id = t.TypeOf<typeof id>;

export const idOrUndefined = t.union([id, t.undefined]);
export type IdOrUndefined = t.TypeOf<typeof idOrUndefined>;

export const index = t.array(t.string);
export type Index = t.TypeOf<typeof index>;

export const data_view_id = t.string;

export const dataViewIdOrUndefined = t.union([data_view_id, t.undefined]);

export const indexOrUndefined = t.union([index, t.undefined]);
export type IndexOrUndefined = t.TypeOf<typeof indexOrUndefined>;

export const interval = t.string;
export type Interval = t.TypeOf<typeof interval>;

export const query = t.string;
export type Query = t.TypeOf<typeof query>;

export const queryOrUndefined = t.union([query, t.undefined]);
export type QueryOrUndefined = t.TypeOf<typeof queryOrUndefined>;

export const license = t.string;
export type License = t.TypeOf<typeof license>;

export const licenseOrUndefined = t.union([license, t.undefined]);

export const objects = t.array(t.type({ rule_id }));

export const output_index = t.string;

export const saved_id = t.string;

export const savedIdOrUndefined = t.union([saved_id, t.undefined]);
export type SavedIdOrUndefined = t.TypeOf<typeof savedIdOrUndefined>;

export const timeline_id = t.string;
export type TimelineId = t.TypeOf<typeof timeline_id>;

export const timelineIdOrUndefined = t.union([timeline_id, t.undefined]);

export const timeline_title = t.string;

export const timelineTitleOrUndefined = t.union([timeline_title, t.undefined]);

export const timestamp_override = t.string;
export type TimestampOverride = t.TypeOf<typeof timestamp_override>;

export const timestampOverrideOrUndefined = t.union([timestamp_override, t.undefined]);
export type TimestampOverrideOrUndefined = t.TypeOf<typeof timestampOverrideOrUndefined>;

export const anomaly_threshold = PositiveInteger;

export const timestamp_override_fallback_disabled = t.boolean;

export const timestampOverrideFallbackDisabledOrUndefined = t.union([
  timestamp_override_fallback_disabled,
  t.undefined,
]);

/**
 * Note that this is a non-exact io-ts type as we allow extra meta information
 * to be added to the meta object
 */
export const meta = t.object;
export type Meta = t.TypeOf<typeof meta>;
export const metaOrUndefined = t.union([meta, t.undefined]);
export type MetaOrUndefined = t.TypeOf<typeof metaOrUndefined>;

export const name = NonEmptyString;
export type Name = t.TypeOf<typeof name>;

export const rule_name_override = t.string;
export type RuleNameOverride = t.TypeOf<typeof rule_name_override>;

export const ruleNameOverrideOrUndefined = t.union([rule_name_override, t.undefined]);
export type RuleNameOverrideOrUndefined = t.TypeOf<typeof ruleNameOverrideOrUndefined>;

export const status = t.keyof({
  open: null,
  closed: null,
  acknowledged: null,
  'in-progress': null,
});
export type Status = t.TypeOf<typeof status>;

export const conflicts = t.keyof({ abort: null, proceed: null });

// TODO: Create a regular expression type or custom date math part type here
export const to = t.string;
export type To = t.TypeOf<typeof to>;

export const queryFilter = t.string;
export type QueryFilter = t.TypeOf<typeof queryFilter>;

export const queryFilterOrUndefined = t.union([queryFilter, t.undefined]);
export type QueryFilterOrUndefined = t.TypeOf<typeof queryFilterOrUndefined>;

export const references = t.array(t.string);
export type References = t.TypeOf<typeof references>;

export const signal_ids = t.array(t.string);
export type SignalIds = t.TypeOf<typeof signal_ids>;

// TODO: Can this be more strict or is this is the set of all Elastic Queries?
export const signal_status_query = t.object;

export const tags = t.array(t.string);
export type Tags = t.TypeOf<typeof tags>;

export const fields = t.array(t.string);
export type Fields = t.TypeOf<typeof fields>;
export const fieldsOrUndefined = t.union([fields, t.undefined]);
export type FieldsOrUndefined = t.TypeOf<typeof fieldsOrUndefined>;

export const thresholdField = t.exact(
  t.type({
    field: t.union([t.string, t.array(t.string)]), // Covers pre- and post-7.12
    value: PositiveIntegerGreaterThanZero,
  })
);

export const thresholdFieldNormalized = t.exact(
  t.type({
    field: t.array(t.string),
    value: PositiveIntegerGreaterThanZero,
  })
);

export const thresholdCardinalityField = t.exact(
  t.type({
    field: t.string,
    value: PositiveInteger,
  })
);

export const threshold = t.intersection([
  thresholdField,
  t.exact(
    t.partial({
      cardinality: t.array(thresholdCardinalityField),
    })
  ),
]);
export type Threshold = t.TypeOf<typeof threshold>;

export const thresholdNormalized = t.intersection([
  thresholdFieldNormalized,
  t.exact(
    t.partial({
      cardinality: t.array(thresholdCardinalityField),
    })
  ),
]);
export type ThresholdNormalized = t.TypeOf<typeof thresholdNormalized>;

export const thresholdWithCardinality = t.intersection([
  thresholdFieldNormalized,
  t.exact(
    t.type({
      cardinality: t.array(thresholdCardinalityField),
    })
  ),
]);
export type ThresholdWithCardinality = t.TypeOf<typeof thresholdWithCardinality>;

// New terms rule type currently only supports a single term, but should support more in the future
export const newTermsFields = LimitedSizeArray({ codec: t.string, minSize: 1, maxSize: 1 });
export type NewTermsFields = t.TypeOf<typeof newTermsFields>;

export const historyWindowStart = NonEmptyString;
export type HistoryWindowStart = t.TypeOf<typeof historyWindowStart>;

export const created_at = IsoDateString;

export const updated_at = IsoDateString;

export const updated_by = t.string;

export const created_by = t.string;

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

export const namespaceOrUndefined = t.union([namespace, t.undefined]);

export const noteOrUndefined = t.union([note, t.undefined]);

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

export const indexType = t.type({
  index: indexRecord,
});

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
