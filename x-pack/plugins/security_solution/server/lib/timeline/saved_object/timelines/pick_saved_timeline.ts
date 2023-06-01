/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import type { AuthenticatedUser } from '@kbn/security-plugin/common/model';
import { getUserDisplayName } from '@kbn/user-profile-components';
import { UNAUTHENTICATED_USER } from '../../../../../common/constants';
import type { SavedObjectTimelineWithSavedObjectId } from '../../../../../common/types/timeline';
import { SavedObjectTimelineType, TimelineStatus } from '../../../../../common/types/timeline';

export const pickSavedTimeline = (
  timelineId: string | null,
  savedTimeline: SavedObjectTimelineWithSavedObjectId,
  userInfo: AuthenticatedUser | null
): SavedObjectTimelineWithSavedObjectId => {
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

  if (savedTimeline.timelineType === SavedObjectTimelineType.default) {
    savedTimeline.timelineType = savedTimeline.timelineType ?? SavedObjectTimelineType.default;
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
