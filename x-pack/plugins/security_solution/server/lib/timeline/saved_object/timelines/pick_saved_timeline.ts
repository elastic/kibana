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
import { TimelineTypeEnum, TimelineStatusEnum } from '../../../../../common/api/timeline';

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

  if (savedTimeline.status === TimelineStatusEnum.draft || savedTimeline.status == null) {
    savedTimeline.status = !isEmpty(savedTimeline.title)
      ? TimelineStatusEnum.active
      : TimelineStatusEnum.draft;
  }

  if (savedTimeline.timelineType === TimelineTypeEnum.default) {
    savedTimeline.timelineType = savedTimeline.timelineType ?? TimelineTypeEnum.default;
    savedTimeline.status = savedTimeline.status ?? TimelineStatusEnum.active;
    savedTimeline.templateTimelineId = null;
    savedTimeline.templateTimelineVersion = null;
  }

  if (!isEmpty(savedTimeline.title) && savedTimeline.status === TimelineStatusEnum.draft) {
    savedTimeline.status = TimelineStatusEnum.active;
  }

  savedTimeline.excludedRowRendererIds = savedTimeline.excludedRowRendererIds ?? [];

  return savedTimeline;
};
