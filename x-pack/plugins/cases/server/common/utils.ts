/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsFindResult, SavedObjectsFindResponse } from 'kibana/server';
import { CaseStatuses, CommentAttributes, CommentRequest, CommentType, User } from '../../common';
import { UpdateAlertRequest } from '../client/types';
import { getAlertInfoFromComments } from '../routes/api/utils';

/**
 * Default sort field for querying saved objects.
 */
export const defaultSortField = 'created_at';

/**
 * Default unknown user
 */
export const nullUser: User = { username: null, full_name: null, email: null };

/**
 * Adds the ids and indices to a map of statuses
 */
export function createAlertUpdateRequest({
  comment,
  status,
}: {
  comment: CommentRequest;
  status: CaseStatuses;
}): UpdateAlertRequest[] {
  return getAlertInfoFromComments([comment]).map((alert) => ({ ...alert, status }));
}

/**
 * Combines multiple filter expressions using the specified operator and parenthesis if multiple expressions exist.
 * This will ignore empty string filters. If a single valid filter is found it will not wrap in parenthesis.
 *
 * @param filters an array of filters to combine using the specified operator
 * @param operator AND or OR
 */
export const combineFilters = (filters: string[] | undefined, operator: 'OR' | 'AND'): string => {
  const noEmptyStrings = filters?.filter((value) => value !== '');
  const joinedExp = noEmptyStrings?.join(` ${operator} `);
  // if undefined or an empty string
  if (!joinedExp) {
    return '';
  } else if ((noEmptyStrings?.length ?? 0) > 1) {
    // if there were multiple filters, wrap them in ()
    return `(${joinedExp})`;
  } else {
    // return a single value not wrapped in ()
    return joinedExp;
  }
};

/**
 * Counts the total alert IDs within a single comment.
 */
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
    const alertTotalForComment = countAlerts(alertsInfo);
    for (const alert of alertsInfo.references) {
      if (alert.id) {
        const totalAlerts = acc.get(alert.id);

        if (totalAlerts !== undefined) {
          acc.set(alert.id, totalAlerts + alertTotalForComment);
        } else {
          acc.set(alert.id, alertTotalForComment);
        }
      }
    }

    return acc;
  }, new Map<string, number>());
};

/**
 * Counts the total alert IDs for a single case or sub case ID.
 */
export const countAlertsForID = ({
  comments,
  id,
}: {
  comments: SavedObjectsFindResponse<CommentAttributes>;
  id: string;
}): number | undefined => {
  return groupTotalAlertsByID({ comments }).get(id);
};
