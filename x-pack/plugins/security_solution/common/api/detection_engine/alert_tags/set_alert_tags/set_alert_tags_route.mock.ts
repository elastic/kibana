/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ManageAlertTagsRequestBody } from './set_alert_tags.gen';

export const getSetAlertTagsRequestMock = (
  tagsToAdd: string[] = [],
  tagsToRemove: string[] = [],
  ids: string[] = []
): ManageAlertTagsRequestBody => ({
  tags: { tags_to_add: tagsToAdd, tags_to_remove: tagsToRemove },
  ids,
});
