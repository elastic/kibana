/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';
import { AuthenticatedUser } from '../../../../security/common/model';
import { UNAUTHENTICATED_USER } from '../../../common/constants';
import { SavedTimeline, TimelineType, TimelineStatus } from '../../../common/types/timeline';

export const pickSavedTimeline = (
  timelineId: string | null,
  savedTimeline: SavedTimeline,
  userInfo: AuthenticatedUser | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any => {
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

  if (savedTimeline.status === TimelineStatus.draft) {
    savedTimeline.status = !isEmpty(savedTimeline.title)
      ? TimelineStatus.active
      : TimelineStatus.draft;
  }

  if (savedTimeline.timelineType === TimelineType.default) {
    savedTimeline.timelineType = savedTimeline.timelineType ?? TimelineType.default;
    savedTimeline.templateTimelineId = null;
    savedTimeline.templateTimelineVersion = null;
  }

  if (!isEmpty(savedTimeline.title) && savedTimeline.status === TimelineStatus.draft) {
    savedTimeline.status = TimelineStatus.active;
  }

  return savedTimeline;
};
