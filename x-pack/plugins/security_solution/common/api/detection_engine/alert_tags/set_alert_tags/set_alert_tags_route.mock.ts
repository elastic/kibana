/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SetAlertTagsRequestBody } from './set_alert_tags_route';

export const getSetAlertTagsRequestMock = (
  tagsToAdd: string[] = [],
  tagsToRemove: string[] = [],
  ids: string[] = []
<<<<<<< HEAD:x-pack/plugins/security_solution/common/api/detection_engine/alert_tags/set_alert_tags/set_alert_tags_route.mock.ts
): SetAlertTagsRequestBody => ({
  tags: { tags_to_add: tagsToAdd, tags_to_remove: tagsToRemove },
  ids,
});
=======
): SetAlertTagsSchema => ({ tags: { tags_to_add: tagsToAdd, tags_to_remove: tagsToRemove }, ids });
>>>>>>> whats-new:x-pack/plugins/security_solution/common/detection_engine/schemas/request/set_alert_tags_schema.mock.ts
