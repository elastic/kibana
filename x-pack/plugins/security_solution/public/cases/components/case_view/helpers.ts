/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CommentType } from '../../../../../case/common/api';
import { Comment } from '../../containers/types';

export const getRuleIdsFromComments = (comments: Comment[]) =>
  comments.reduce<string[]>((ruleIds, comment: Comment) => {
    if (comment.type === CommentType.alert) {
      const ids = Array.isArray(comment.alertId) ? comment.alertId : [comment.alertId];
      return [...ruleIds, ...ids];
    }

    return ruleIds;
  }, []);

export const buildAlertsQuery = (ruleIds: string[]) => ({
  query: {
    bool: {
      filter: {
        bool: {
          should: ruleIds.map((_id) => ({ match: { _id } })),
          minimum_should_match: 1,
        },
      },
    },
  },
});
