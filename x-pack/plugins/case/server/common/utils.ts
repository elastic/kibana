/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsFindResponse } from 'kibana/server';
import { CommentAttributes, CommentType } from '../../common/api';

export const countAlerts = (comments: SavedObjectsFindResponse<CommentAttributes>) => {
  let totalAlerts = 0;
  for (const comment of comments.saved_objects) {
    if (
      comment.attributes.type === CommentType.alert ||
      comment.attributes.type === CommentType.generatedAlert
    ) {
      if (Array.isArray(comment.attributes.alertId)) {
        totalAlerts += comment.attributes.alertId.length;
      } else {
        totalAlerts++;
      }
    }
  }
  return totalAlerts;
};
