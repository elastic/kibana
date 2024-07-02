/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import { z } from 'zod';

export type FileName = z.infer<typeof file_name>;
export const file_name = z.string();

export type ExcludeExportDetails = z.infer<typeof exclude_export_details>;
export const exclude_export_details = z.boolean();

export const saved_id = z.string();

export type SavedIdOrUndefined = z.infer<typeof savedIdOrUndefined>;
export const savedIdOrUndefined = saved_id.optional();

export const status = z.enum(['open', 'closed', 'acknowledged', 'in-progress']);
export type Status = z.infer<typeof status>;

export const signal_ids = z.array(z.string());
export type SignalIds = z.infer<typeof signal_ids>;

export const alert_tag_ids = z.array(z.string());
export type AlertTagIds = z.infer<typeof alert_tag_ids>;

export const indexRecord = z.record(
  z.string(),
  z.object({
    all: z.boolean(),
    maintenance: z.boolean(),
    read: z.boolean(),
    create_index: z.boolean(),
    index: z.boolean(),
    monitor: z.boolean(),
    delete: z.boolean(),
    manage: z.boolean(),
    delete_index: z.boolean(),
    create_doc: z.boolean(),
    view_index_metadata: z.boolean(),
    create: z.boolean(),
    write: z.boolean(),
  })
);

export const privilege = z.object({
  username: z.string(),
  has_all_requested: z.boolean(),
  cluster: z.object({
    monitor_ml: z.boolean(),
    manage_index_templates: z.boolean(),
    monitor_transform: z.boolean(),
    manage_security: z.boolean(),
    manage_own_api_key: z.boolean(),
    all: z.boolean(),
    monitor: z.boolean(),
    manage: z.boolean(),
    manage_transform: z.boolean(),
    manage_ml: z.boolean(),
    manage_pipeline: z.boolean(),
  }),
  index: indexRecord,
  is_authenticated: z.boolean(),
  has_encryption_key: z.boolean(),
});

export type Privilege = z.infer<typeof privilege>;

export const alert_tags = z.object({
  tags_to_add: z.array(z.string()),
  tags_to_remove: z.array(z.string()),
});

export type AlertTags = z.infer<typeof alert_tags>;

export const user_search_term = z.string();
export type UserSearchTerm = z.infer<typeof user_search_term>;
