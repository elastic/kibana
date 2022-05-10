/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { ValidFeatureId, AlertConsumers } from '@kbn/rule-data-utils';

import { CommentType } from '../../../common/api';
import type { Comment } from '../../containers/types';
import { SUPPORTED_ACTION_TYPES } from './constants';
import { SupportedUserActionTypes } from './types';

export const isUserActionTypeSupported = (type: string): type is SupportedUserActionTypes =>
  SUPPORTED_ACTION_TYPES.includes(type as SupportedUserActionTypes);

export const getManualAlertIdsWithNoRuleId = (comments: Comment[]): string[] => {
  const dedupeAlerts = comments.reduce((alertIds, comment: Comment) => {
    if (comment.type === CommentType.alert && isEmpty(comment.rule.id)) {
      const ids = Array.isArray(comment.alertId) ? comment.alertId : [comment.alertId];
      ids.forEach((id) => alertIds.add(id));
      return alertIds;
    }
    return alertIds;
  }, new Set<string>());
  return Array.from(dedupeAlerts);
};

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

export const getFeatureIdsFromAlertIndices = (comments: Comment[]): ValidFeatureId[] => {
  const dedupeFeatureId = comments.reduce((featureIds, comment: Comment) => {
    if (comment.type === CommentType.alert) {
      const indices = Array.isArray(comment.index) ? comment.index : [comment.index];
      indices.forEach((index) => {
        if (index.includes('alerts-observability.apm')) {
          featureIds.add(AlertConsumers.APM);
        } else if (index.includes('alerts-observability.logs')) {
          featureIds.add(AlertConsumers.LOGS);
        } else if (index.includes('alerts-observability.metrics')) {
          featureIds.add(AlertConsumers.INFRASTRUCTURE);
        } else if (index.includes('alerts-observability.uptime')) {
          featureIds.add(AlertConsumers.UPTIME);
        } else if (index.includes('alerts-security.alerts') || index.includes('siem')) {
          featureIds.add(AlertConsumers.SIEM);
        }
      });
      return featureIds;
    }
    return featureIds;
  }, new Set<ValidFeatureId>());
  return Array.from(dedupeFeatureId);
};
