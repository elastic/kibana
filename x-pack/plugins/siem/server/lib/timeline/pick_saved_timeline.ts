/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { AuthenticatedUser } from '../../../../security/common/model';
import { UNAUTHENTICATED_USER } from '../../../common/constants';
import { SavedTimeline, TimelineType } from '../../../common/types/timeline';

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

  if (savedTimeline.timelineType === TimelineType.template) {
    savedTimeline.timelineType = TimelineType.template;
    if (savedTimeline.templateTimelineId == null) {
      savedTimeline.templateTimelineId = uuid.v4();
    }

    if (savedTimeline.templateTimelineVersion == null) {
      savedTimeline.templateTimelineVersion = 1;
    }
  } else {
    savedTimeline.timelineType = TimelineType.default;
    savedTimeline.templateTimelineId = null;
    savedTimeline.templateTimelineVersion = null;
  }

  return savedTimeline;
};
