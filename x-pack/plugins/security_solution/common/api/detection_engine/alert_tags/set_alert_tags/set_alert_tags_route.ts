/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { alert_tag_query, alert_tags } from '../../model';

export const setAlertTagsRequestBody = t.intersection([
  t.type({
    tags: alert_tags,
  }),
  t.partial({
    query: alert_tag_query,
  }),
]);

export type SetAlertTagsRequestBody = t.TypeOf<typeof setAlertTagsRequestBody>;
export type SetAlertTagsRequestBodyDecoded = SetAlertTagsRequestBody;
