/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsFindResult, SavedObjectsFindResponse } from 'kibana/server';
import { CommentAttributes, CommentType } from '../../common/api';

export const defaultSortField = 'created_at';

// TODO: write unit tests for these function
export const countAlerts = (comment: SavedObjectsFindResult<CommentAttributes>) => {
  let totalAlerts = 0;
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
  return totalAlerts;
};

/**
 * Count the number of alerts for each id in the alert's references. This will result
 * in a map with entries for both the collection and the individual sub cases. So the resulting
 * size of the map will not equal the total number of sub cases.
 */
export const groupTotalAlertsByID = ({
  comments,
}: {
  comments: SavedObjectsFindResponse<CommentAttributes>;
}): Map<string, number> => {
  return comments.saved_objects.reduce((acc, alertsInfo) => {
    for (const alert of alertsInfo.references) {
      if (alert.id) {
        const totalAlerts = acc.get(alert.id);
        if (totalAlerts !== undefined) {
          acc.set(alert.id, totalAlerts + countAlerts(alertsInfo));
        } else {
          acc.set(alert.id, countAlerts(alertsInfo));
        }
      }
    }

    return acc;
  }, new Map<string, number>());
};

export const countAlertsForID = ({
  comments,
  id,
}: {
  comments: SavedObjectsFindResponse<CommentAttributes>;
  id: string;
}): number | undefined => {
  return groupTotalAlertsByID({ comments }).get(id);
};
