/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { CommentType } from '../../../../../case/common/api';
import { Comment } from '../../containers/types';

export const getManualAlertIdsWithNoRuleId = (comments: Comment[]): string[] => {
  const dedupeAlerts = comments.reduce((alertIds, comment: Comment) => {
    if (comment.type === CommentType.alert && isEmpty(comment.rule.id)) {
      const ids = Array.isArray(comment.alertId) ? comment.alertId : [comment.alertId];
      ids.forEach((id) => alertIds.add(id));
      return alertIds;
    }
    return alertIds;
  }, new Set<string>());
  return [...dedupeAlerts];
};

// TODO we need to allow ->  docValueFields: [{ field: "@timestamp" }],
export const buildAlertsQuery = (alertIds: string[]) => {
  if (alertIds.length === 0) {
    return {};
  }
  return {
    query: {
      bool: {
        filter: {
          ids: {
            values: alertIds,
          },
        },
      },
    },
    size: 10000,
  };
};
