/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { alert_tag_query, alert_tags } from '../common/schemas';

export const setAlertTagsSchema = t.intersection([
  t.type({
    tags: alert_tags,
  }),
  t.partial({
    query: alert_tag_query,
  }),
]);

export type SetAlertTagsSchema = t.TypeOf<typeof setAlertTagsSchema>;
export type SetAlertTagsSchemaDecoded = SetAlertTagsSchema;
