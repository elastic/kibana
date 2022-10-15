/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import * as t from 'io-ts';
import {
  IsoDateString,
  NonEmptyString,
  PositiveInteger,
  PositiveIntegerGreaterThanZero,
  LimitedSizeArray,
} from '@kbn/securitysolution-io-ts-types';

export const file_name = t.string;
export type FileName = t.TypeOf<typeof file_name>;

export const exclude_export_details = t.boolean;
export type ExcludeExportDetails = t.TypeOf<typeof exclude_export_details>;

export const saved_id = t.string;

export const savedIdOrUndefined = t.union([saved_id, t.undefined]);
export type SavedIdOrUndefined = t.TypeOf<typeof savedIdOrUndefined>;

export const anomaly_threshold = PositiveInteger;

export const status = t.keyof({
  open: null,
  closed: null,
  acknowledged: null,
  'in-progress': null,
});
export type Status = t.TypeOf<typeof status>;

export const conflicts = t.keyof({ abort: null, proceed: null });

export const queryFilter = t.string;
export type QueryFilter = t.TypeOf<typeof queryFilter>;

export const queryFilterOrUndefined = t.union([queryFilter, t.undefined]);
export type QueryFilterOrUndefined = t.TypeOf<typeof queryFilterOrUndefined>;

export const signal_ids = t.array(t.string);
export type SignalIds = t.TypeOf<typeof signal_ids>;

// TODO: Can this be more strict or is this is the set of all Elastic Queries?
export const signal_status_query = t.object;

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
export const created_by = t.string;
export const updated_by = t.string;

export const status_code = PositiveInteger;
export const message = t.string;
export const perPage = PositiveInteger;
export const total = PositiveInteger;
export const success = t.boolean;
export const success_count = PositiveInteger;

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
