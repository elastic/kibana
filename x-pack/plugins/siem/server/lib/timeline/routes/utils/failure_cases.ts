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
export const TEMPLATE_TIMELINE_VERSION_CONFLICT_MESSAGE = 'Template timelineVersion conflict';
export const CREATE_TIMELINE_ERROR_MESSAGE =
  'UPDATE timeline with POST is not allowed, please use PATCH instead';
export const CREATE_TEMPLATE_TIMELINE_ERROR_MESSAGE =
  'UPDATE template timeline with POST is not allowed, please use PATCH instead';
export const EMPTY_TITLE_ERROR_MESSAGE = 'Title cannot be empty';

export const commonFailureChecker = (title: string | null | undefined) => {
  if (title == null) {
    return {
      body: EMPTY_TITLE_ERROR_MESSAGE,
      statusCode: 405,
    };
  }
  return null;
};

export const checkIsUpdateFailureCases = (
  isHandlingTemplateTimeline: boolean,
  version: string | null,
  templateTimelineVersion: number | null,
  existTimeline: TimelineSavedObject | null,
  existTemplateTimeline: TimelineSavedObject | null
) => {
  if (isHandlingTemplateTimeline) {
    if (existTemplateTimeline == null) {
      // template timeline !exists
      // Throw error to create template timeline in patch
      return {
        body: UPDATE_TEMPLATE_TIMELINE_ERROR_MESSAGE,
        statusCode: 405,
      };
    }

    if (
      existTimeline != null &&
      existTemplateTimeline != null &&
      existTimeline.savedObjectId !== existTemplateTimeline.savedObjectId
    ) {
      // Throw error you can not have a no matching between your timeline and your template timeline during an update
      return {
        body: NO_MATCH_ID_ERROR_MESSAGE,
        statusCode: 409,
      };
    }

    if (
      existTemplateTimeline != null &&
      existTemplateTimeline.templateTimelineVersion == null &&
      existTemplateTimeline.version !== version
    ) {
      // throw error 409 conflict timeline
      return {
        body: NO_MATCH_VERSION_ERROR_MESSAGE,
        statusCode: 409,
      };
    }

    if (
      templateTimelineVersion != null &&
      existTemplateTimeline != null &&
      existTemplateTimeline.templateTimelineVersion != null &&
      existTemplateTimeline.templateTimelineVersion !== templateTimelineVersion
    ) {
      // Throw error you can not update a template timeline version with an old version
      return {
        body: TEMPLATE_TIMELINE_VERSION_CONFLICT_MESSAGE,
        statusCode: 409,
      };
    }

    return null;
  } else {
    if (existTimeline == null) {
      // timeline !exists
      return {
        body: UPDATE_TIMELINE_ERROR_MESSAGE,
        statusCode: 405,
      };
    }

    if (existTimeline?.version !== version) {
      // throw error 409 conflict timeline
      return {
        body: NO_MATCH_VERSION_ERROR_MESSAGE,
        statusCode: 409,
      };
    }

    return null;
  }
};

export const checkIsCreateFailureCases = (
  isHandlingTemplateTimeline: boolean,
  version: string | null,
  templateTimelineVersion: number | null,
  existTimeline: TimelineSavedObject | null,
  existTemplateTimeline: TimelineSavedObject | null
) => {
  if (!isHandlingTemplateTimeline && existTimeline != null) {
    return {
      body: CREATE_TIMELINE_ERROR_MESSAGE,
      statusCode: 405,
    };
  } else if (isHandlingTemplateTimeline && existTemplateTimeline != null) {
    // Throw error to create template timeline in patch
    return {
      body: CREATE_TEMPLATE_TIMELINE_ERROR_MESSAGE,
      statusCode: 405,
    };
  } else {
    return null;
  }
};

const getImportExistingTimelineError = (id: string, timelineType: string) =>
  `${timelineType}_id: "${id}" already exists`;

export const checkIsCreateViaImportFailureCases = (
  isHandlingTemplateTimeline: boolean,
  version: string | null,
  templateTimelineVersion: number | null,
  existTimeline: TimelineSavedObject | null,
  existTemplateTimeline: TimelineSavedObject | null
) => {
  const timelineType = isHandlingTemplateTimeline ? 'template_timeline' : 'timeline';
  if (!isHandlingTemplateTimeline && existTimeline != null) {
    return {
      body: getImportExistingTimelineError(existTimeline.savedObjectId, timelineType),
      statusCode: 405,
    };
  } else if (isHandlingTemplateTimeline && existTemplateTimeline != null) {
    // Throw error to create template timeline in patch
    return {
      body: getImportExistingTimelineError(existTemplateTimeline.savedObjectId, timelineType),
      statusCode: 405,
    };
  } else {
    return null;
  }
};
