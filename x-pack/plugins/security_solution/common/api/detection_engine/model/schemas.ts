/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import * as t from 'io-ts';
import { PositiveInteger } from '@kbn/securitysolution-io-ts-types';

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

export const signal_ids = t.array(t.string);
export type SignalIds = t.TypeOf<typeof signal_ids>;

// TODO: Can this be more strict or is this is the set of all Elastic Queries?
export const signal_status_query = t.object;

export const alert_tag_ids = t.array(t.string);
export type AlertTagIds = t.TypeOf<typeof alert_tag_ids>;

export const indexRecord = t.record(
  t.string,
  t.type({
    all: t.boolean,
    maintenance: t.boolean,
    read: t.boolean,
    create_index: t.boolean,
    index: t.boolean,
    monitor: t.boolean,
    delete: t.boolean,
    manage: t.boolean,
    delete_index: t.boolean,
    create_doc: t.boolean,
    view_index_metadata: t.boolean,
    create: t.boolean,
    write: t.boolean,
  })
);

export const privilege = t.type({
  username: t.string,
  has_all_requested: t.boolean,
  cluster: t.type({
    monitor_ml: t.boolean,
    manage_index_templates: t.boolean,
    monitor_transform: t.boolean,
    manage_security: t.boolean,
    manage_own_api_key: t.boolean,
    all: t.boolean,
    monitor: t.boolean,
    manage: t.boolean,
    manage_transform: t.boolean,
    manage_ml: t.boolean,
    manage_pipeline: t.boolean,
  }),
  index: indexRecord,
  is_authenticated: t.boolean,
  has_encryption_key: t.boolean,
});

export type Privilege = t.TypeOf<typeof privilege>;

export const alert_tags = t.type({
  tags_to_add: t.array(t.string),
  tags_to_remove: t.array(t.string),
});

export type AlertTags = t.TypeOf<typeof alert_tags>;

export const user_search_term = t.string;
export type UserSearchTerm = t.TypeOf<typeof user_search_term>;
