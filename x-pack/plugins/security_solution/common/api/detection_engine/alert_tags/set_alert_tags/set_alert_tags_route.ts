/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { alert_tag_ids, alert_tags } from '../../model';

export const setAlertTagsRequestBody = t.exact(
  t.type({
    tags: alert_tags,
    ids: alert_tag_ids,
  })
);

export type SetAlertTagsRequestBody = t.TypeOf<typeof setAlertTagsRequestBody>;
export type SetAlertTagsRequestBodyDecoded = SetAlertTagsRequestBody;
