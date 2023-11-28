/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import type { AuthenticatedUser } from '@kbn/security-plugin/common';
import { getUserDisplayName } from '@kbn/user-profile-components';
import { UNAUTHENTICATED_USER } from '../../../../../common/constants';
import type { SavedTimelineWithSavedObjectId } from '../../../../../common/api/timeline';
import { TimelineType, TimelineStatus } from '../../../../../common/api/timeline';

export const pickSavedTimeline = (
  timelineId: string | null,
  savedTimeline: SavedTimelineWithSavedObjectId,
  userInfo: AuthenticatedUser | null
): SavedTimelineWithSavedObjectId => {
  const dateNow = new Date().valueOf();

  if (timelineId == null) {
    savedTimeline.created = dateNow;
    savedTimeline.createdBy = userInfo ? getUserDisplayName(userInfo) : UNAUTHENTICATED_USER;
    savedTimeline.updated = dateNow;
    savedTimeline.updatedBy = userInfo ? getUserDisplayName(userInfo) : UNAUTHENTICATED_USER;
  } else if (timelineId != null) {
    savedTimeline.updated = dateNow;
    savedTimeline.updatedBy = userInfo ? getUserDisplayName(userInfo) : UNAUTHENTICATED_USER;
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
