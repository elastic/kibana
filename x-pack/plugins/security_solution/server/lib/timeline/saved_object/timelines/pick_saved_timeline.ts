/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import { AuthenticatedUser } from '@kbn/security-plugin/common/model';
import { UNAUTHENTICATED_USER } from '../../../../../common/constants';
import {
  TimelineType,
  TimelineStatus,
  SavedTimelineWithSavedObjectId,
} from '../../../../../common/types/timeline';

export const pickSavedTimeline = (
  timelineId: string | null,
  savedTimeline: SavedTimelineWithSavedObjectId,
  userInfo: AuthenticatedUser | null
): SavedTimelineWithSavedObjectId => {
  const dateNow = new Date().valueOf();

  if (timelineId == null) {
    savedTimeline.created = dateNow;
    savedTimeline.createdBy = userInfo?.username ?? UNAUTHENTICATED_USER;
    savedTimeline.updated = dateNow;
    savedTimeline.updatedBy = userInfo?.username ?? UNAUTHENTICATED_USER;
  } else if (timelineId != null) {
    savedTimeline.updated = dateNow;
    savedTimeline.updatedBy = userInfo?.username ?? UNAUTHENTICATED_USER;
  }

  if (savedTimeline.status === TimelineStatus.draft || savedTimeline.status == null) {
    savedTimeline.status = !isEmpty(savedTimeline.title)
      ? TimelineStatus.active
      : TimelineStatus.draft;
  }

  if (savedTimeline.timelineType === TimelineType.default) {
    savedTimeline.timelineType = savedTimeline.timelineType ?? TimelineType.default;
    savedTimeline.status = savedTimeline.status ?? TimelineStatus.active;
    savedTimeline.templateTimelineId = null;
    savedTimeline.templateTimelineVersion = null;
  }

  if (!isEmpty(savedTimeline.title) && savedTimeline.status === TimelineStatus.draft) {
    savedTimeline.status = TimelineStatus.active;
  }

  savedTimeline.excludedRowRendererIds = savedTimeline.excludedRowRendererIds ?? [];

  return savedTimeline;
};
