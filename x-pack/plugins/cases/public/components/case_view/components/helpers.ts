/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CommentType } from '../../../../common/api';
import type { Comment } from '../../../containers/types';

export const getManualAlertIds = (comments: Comment[]): string[] => {
  const dedupeAlerts = comments.reduce((alertIds, comment: Comment) => {
    if (comment.type === CommentType.alert) {
      const ids = Array.isArray(comment.alertId) ? comment.alertId : [comment.alertId];
      ids.forEach((id) => alertIds.add(id));
      return alertIds;
    }
    return alertIds;
  }, new Set<string>());
  return Array.from(dedupeAlerts);
};

export const getRegistrationContextFromAlerts = (comments: Comment[]): string[] => {
  const dedupeRegistrationContext = comments.reduce((registrationContexts, comment: Comment) => {
    if (comment.type === CommentType.alert) {
      const indices = Array.isArray(comment.index) ? comment.index : [comment.index];
      indices.forEach((index) => {
        // That's legacy code, we created some index alias so everything should work as expected
        if (index.startsWith('.siem-signals')) {
          registrationContexts.add('security');
        } else {
          const registrationContext = getRegistrationContextFromIndex(index);
          if (registrationContext) {
            registrationContexts.add(registrationContext);
          }
        }
      });
      return registrationContexts;
    }
    return registrationContexts;
  }, new Set<string>());
  return Array.from(dedupeRegistrationContext);
};

export const getRegistrationContextFromIndex = (indexName: string): string | null => {
  const found = indexName.match(/\.alerts-(.*?).alerts/);
  if (found && found.length > 1) {
    return `${found[1]}`;
  }
  return null;
};
