/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CommentType } from '../../../../../case/common/api';
import { Comment } from '../../containers/types';

export const getAlertIdsFromComments = (comments: Comment[]): string[] => {
  const dedupeAlerts = comments.reduce((alertIds, comment: Comment) => {
    if (comment.type === CommentType.alert || comment.type === CommentType.generatedAlert) {
      const ids = Array.isArray(comment.alertId) ? comment.alertId : [comment.alertId];
      ids.forEach(id => alertIds.add(id));
      return alertIds;
    }
    return alertIds;
  }, new Set<string>());
  return [...dedupeAlerts];
}

export const buildAlertsQuery = (alertIds: string[]) => ({
  query: {
    bool: {
      filter: {
        ids: {
          values: alertIds,
        },
      },
    },
  },
  size: 5000,
});
