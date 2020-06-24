/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable complexity */

import {
  TimelineSavedObject,
  SavedTimeline,
  TimelineStatus,
} from '../../../../../common/types/timeline';

export const UPDATE_TIMELINE_ERROR_MESSAGE =
  'CREATE timeline with PATCH is not allowed, please use POST instead';
export const UPDATE_TEMPLATE_TIMELINE_ERROR_MESSAGE =
  'CREATE timeline template with PATCH is not allowed, please use POST instead';
export const NO_MATCH_VERSION_ERROR_MESSAGE =
  'TimelineVersion conflict: The given version doesn not match with existing timeline';
export const NO_MATCH_ID_ERROR_MESSAGE =
  "Timeline id doesn't match with existing timeline template";
export const TEMPLATE_TIMELINE_VERSION_CONFLICT_MESSAGE = 'Timeline templateVersion conflict';
export const UPDATE_ACTIVE_TIMELINE_STATUS_ERROR_MESSAGE =
  "Changing 'active' Timeline status is not allowed";

export const checkIsFailureCases = (
  isHandlingTemplateTimeline: boolean,
  version: string | null,
  templateTimelineVersion: number | null,
  existTimeline: TimelineSavedObject | null,
  existTemplateTimeline: TimelineSavedObject | null,
  timeline: SavedTimeline
) => {
  if (!isHandlingTemplateTimeline && existTimeline == null) {
    return {
      body: UPDATE_TIMELINE_ERROR_MESSAGE,
      statusCode: 405,
    };
  } else if (isHandlingTemplateTimeline && existTemplateTimeline == null) {
    // Throw error to create timeline template in patch
    return {
      body: UPDATE_TEMPLATE_TIMELINE_ERROR_MESSAGE,
      statusCode: 405,
    };
  } else if (
    isHandlingTemplateTimeline &&
    existTimeline != null &&
    existTemplateTimeline != null &&
    existTimeline.savedObjectId !== existTemplateTimeline.savedObjectId
  ) {
    // Throw error you can not have a no matching between your timeline and your timeline template during an update
    return {
      body: NO_MATCH_ID_ERROR_MESSAGE,
      statusCode: 409,
    };
  } else if (!isHandlingTemplateTimeline && existTimeline?.version !== version) {
    // throw error 409 conflict timeline
    return {
      body: NO_MATCH_VERSION_ERROR_MESSAGE,
      statusCode: 409,
    };
  } else if (
    isHandlingTemplateTimeline &&
    existTemplateTimeline != null &&
    existTemplateTimeline.templateTimelineVersion == null &&
    existTemplateTimeline.version !== version
  ) {
    // throw error 409 conflict timeline
    return {
      body: NO_MATCH_VERSION_ERROR_MESSAGE,
      statusCode: 409,
    };
  } else if (
    isHandlingTemplateTimeline &&
    templateTimelineVersion != null &&
    existTemplateTimeline != null &&
    existTemplateTimeline.templateTimelineVersion != null &&
    existTemplateTimeline.templateTimelineVersion !== templateTimelineVersion
  ) {
    // Throw error you can not update a timeline template version with an old version
    return {
      body: TEMPLATE_TIMELINE_VERSION_CONFLICT_MESSAGE,
      statusCode: 409,
    };
  } else if (
    timeline.status === TimelineStatus.draft &&
    (existTimeline?.status === TimelineStatus.active ||
      existTemplateTimeline?.status === TimelineStatus.active)
  ) {
    return {
      body: UPDATE_ACTIVE_TIMELINE_STATUS_ERROR_MESSAGE,
      statusCode: 409,
    };
  } else {
    return null;
  }
};
