/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimelineSavedObject } from '../../../../../common/types/timeline';

export const UPDATE_TIMELINE_ERROR_MESSAGE =
  'CREATE timeline with PATCH is not allowed, please use POST instead';
export const UPDATE_TEMPLATE_TIMELINE_ERROR_MESSAGE =
  'CREATE template timeline with PATCH is not allowed, please use POST instead';
export const NO_MATCH_VERSION_ERROR_MESSAGE =
  'TimelineVersion conflict: The given version doesn not match with existing timeline';
export const NO_MATCH_ID_ERROR_MESSAGE =
  "Timeline id doesn't match with existing template timeline";
export const OLDER_VERSION_ERROR_MESSAGE =
  'Template timelineVersion conflict: The given version is older then existing version';

export const checkIsFailureCases = (
  isHandlingTemplateTimeline: boolean,
  version: string | null,
  templateTimelineVersion: number | null,
  existTimeline: TimelineSavedObject | null,
  existTemplateTimeline: TimelineSavedObject | null
) => {
  if (!isHandlingTemplateTimeline && existTimeline == null) {
    return {
      body: UPDATE_TIMELINE_ERROR_MESSAGE,
      statusCode: 405,
    };
  } else if (isHandlingTemplateTimeline && existTemplateTimeline == null) {
    // Throw error to create template timeline in patch
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
    // Throw error you can not have a no matching between your timeline and your template timeline during an update
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
    existTemplateTimeline.templateTimelineVersion >= templateTimelineVersion
  ) {
    // Throw error you can not update a template timeline version with an old version
    return {
      body: OLDER_VERSION_ERROR_MESSAGE,
      statusCode: 409,
    };
  } else {
    return null;
  }
};
