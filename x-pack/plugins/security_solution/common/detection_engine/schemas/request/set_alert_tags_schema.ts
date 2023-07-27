/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { alert_tag_ids, alert_tags } from '../common/schemas';

export const setAlertTagsSchema = t.exact(
  t.type({
    tags: alert_tags,
    ids: alert_tag_ids,
  })
);

export type SetAlertTagsSchema = t.TypeOf<typeof setAlertTagsSchema>;
export type SetAlertTagsSchemaDecoded = SetAlertTagsSchema;
