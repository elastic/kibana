/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isEmpty } from 'lodash/fp';
import {
  TimelineSavedObject,
  TimelineStatus,
  TimelineTypeLiteral,
} from '../../../../../common/types/timeline';

export const UPDATE_TIMELINE_ERROR_MESSAGE =
  'You cannot create new timelines with PATCH. Use POST instead.';
export const UPDATE_TEMPLATE_TIMELINE_ERROR_MESSAGE =
  'You cannot create new Timeline templates with PATCH. Use POST instead (templateTimelineId does not exist).';
export const NO_MATCH_VERSION_ERROR_MESSAGE =
  'Timeline template version conflict. The provided templateTimelineVersion does not match the current template.';
export const NO_MATCH_ID_ERROR_MESSAGE =
  'There are no Timeline templates that match the provided templateTimelineId.';
export const TEMPLATE_TIMELINE_VERSION_CONFLICT_MESSAGE =
  'To update existing Timeline templates, you must increment the templateTimelineVersion value.';
export const CREATE_TIMELINE_ERROR_MESSAGE =
  'You cannot update timelines with POST. Use PATCH instead.';
export const CREATE_TEMPLATE_TIMELINE_ERROR_MESSAGE =
  'You cannot update Timeline templates with POST. Use PATCH instead.';
export const EMPTY_TITLE_ERROR_MESSAGE = 'The title field cannot be empty.';
export const UPDATE_STATUS_ERROR_MESSAGE =
  'You are not allowed to set the status field value to immutable.';
export const CREATE_TEMPLATE_TIMELINE_WITHOUT_VERSION_ERROR_MESSAGE =
  'You must provide a valid templateTimelineVersion value. Use 1 for new Timeline templates.';
export const CREATE_WITH_INVALID_STATUS_ERROR_MESSAGE =
  'You are not allowed to set the status field value to draft.';
export const NOT_ALLOW_UPDATE_STATUS_ERROR_MESSAGE = 'You are not allowed to set the status field.';
export const NOT_ALLOW_UPDATE_TIMELINE_TYPE_ERROR_MESSAGE =
  'You cannot convert a Timeline template to a timeline, or a timeline to a Timeline template.';
export const UPDAT_TIMELINE_VIA_IMPORT_NOT_ALLOWED_ERROR_MESSAGE =
  'You cannot update a timeline via imports. Use the UI to modify existing timelines.';

const isUpdatingStatus = (
  isHandlingTemplateTimeline: boolean,
  status: TimelineStatus | null | undefined,
  existTimeline: TimelineSavedObject | null,
  existTemplateTimeline: TimelineSavedObject | null
) => {
  const obj = isHandlingTemplateTimeline ? existTemplateTimeline : existTimeline;
  return obj?.status === TimelineStatus.immutable ? UPDATE_STATUS_ERROR_MESSAGE : null;
};

const isGivenTitleValid = (status: TimelineStatus, title: string | null | undefined) => {
  return (status !== TimelineStatus.draft && !isEmpty(title)) || status === TimelineStatus.draft
    ? null
    : EMPTY_TITLE_ERROR_MESSAGE;
};

export const getImportExistingTimelineError = (id: string) =>
  `savedObjectId: "${id}" already exists`;

export const commonFailureChecker = (status: TimelineStatus, title: string | null | undefined) => {
  const error = [isGivenTitleValid(status, title)].filter((msg) => msg != null).join(',');
  return !isEmpty(error)
    ? {
        body: error,
        statusCode: 405,
      }
    : null;
};

const commonUpdateTemplateTimelineCheck = (
  isHandlingTemplateTimeline: boolean,
  status: TimelineStatus | null | undefined,
  timelineType: TimelineTypeLiteral,
  version: string | null,
  templateTimelineVersion: number | null,
  templateTimelineId: string | null | undefined,
  existTimeline: TimelineSavedObject | null,
  existTemplateTimeline: TimelineSavedObject | null
) => {
  if (isHandlingTemplateTimeline) {
    if (existTimeline != null && timelineType !== existTimeline.timelineType) {
      return {
        body: NOT_ALLOW_UPDATE_TIMELINE_TYPE_ERROR_MESSAGE,
        statusCode: 403,
      };
    }

    if (existTemplateTimeline == null && templateTimelineVersion != null) {
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
  }
  return null;
};

const commonUpdateTimelineCheck = (
  isHandlingTemplateTimeline: boolean,
  status: TimelineStatus | null | undefined,
  timelineType: TimelineTypeLiteral,
  version: string | null,
  templateTimelineVersion: number | null,
  templateTimelineId: string | null | undefined,
  existTimeline: TimelineSavedObject | null,
  existTemplateTimeline: TimelineSavedObject | null
) => {
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
};

const commonUpdateCases = (
  isHandlingTemplateTimeline: boolean,
  status: TimelineStatus | null | undefined,
  timelineType: TimelineTypeLiteral,
  version: string | null,
  templateTimelineVersion: number | null,
  templateTimelineId: string | null | undefined,
  existTimeline: TimelineSavedObject | null,
  existTemplateTimeline: TimelineSavedObject | null
) => {
  if (isHandlingTemplateTimeline) {
    return commonUpdateTemplateTimelineCheck(
      isHandlingTemplateTimeline,
      status,
      timelineType,
      version,
      templateTimelineVersion,
      templateTimelineId,
      existTimeline,
      existTemplateTimeline
    );
  } else {
    return commonUpdateTimelineCheck(
      isHandlingTemplateTimeline,
      status,
      timelineType,
      version,
      templateTimelineVersion,
      templateTimelineId,
      existTimeline,
      existTemplateTimeline
    );
  }
};

const createTemplateTimelineCheck = (
  isHandlingTemplateTimeline: boolean,
  status: TimelineStatus,
  timelineType: TimelineTypeLiteral,
  version: string | null,
  templateTimelineVersion: number | null,
  templateTimelineId: string | null | undefined,
  existTimeline: TimelineSavedObject | null,
  existTemplateTimeline: TimelineSavedObject | null
) => {
  if (isHandlingTemplateTimeline && existTemplateTimeline != null) {
    // Throw error to create template timeline in patch
    return {
      body: CREATE_TEMPLATE_TIMELINE_ERROR_MESSAGE,
      statusCode: 405,
    };
  } else if (isHandlingTemplateTimeline && templateTimelineVersion == null) {
    return {
      body: CREATE_TEMPLATE_TIMELINE_WITHOUT_VERSION_ERROR_MESSAGE,
      statusCode: 403,
    };
  } else {
    return null;
  }
};

export const checkIsUpdateViaImportFailureCases = (
  isHandlingTemplateTimeline: boolean,
  status: TimelineStatus | null | undefined,
  timelineType: TimelineTypeLiteral,
  version: string | null,
  templateTimelineVersion: number | null,
  templateTimelineId: string | null | undefined,
  existTimeline: TimelineSavedObject | null,
  existTemplateTimeline: TimelineSavedObject | null
) => {
  if (!isHandlingTemplateTimeline) {
    if (existTimeline == null) {
      return { body: UPDAT_TIMELINE_VIA_IMPORT_NOT_ALLOWED_ERROR_MESSAGE, statusCode: 405 };
    } else {
      return {
        body: getImportExistingTimelineError(existTimeline!.savedObjectId),
        statusCode: 405,
      };
    }
  } else {
    if (existTemplateTimeline != null && timelineType !== existTemplateTimeline?.timelineType) {
      return {
        body: NOT_ALLOW_UPDATE_TIMELINE_TYPE_ERROR_MESSAGE,
        statusCode: 403,
      };
    }
    const isStatusValid =
      ((existTemplateTimeline?.status == null ||
        existTemplateTimeline?.status === TimelineStatus.active) &&
        (status == null || status === TimelineStatus.active)) ||
      (existTemplateTimeline?.status != null && status === existTemplateTimeline?.status);

    if (!isStatusValid) {
      return {
        body: NOT_ALLOW_UPDATE_STATUS_ERROR_MESSAGE,
        statusCode: 405,
      };
    }

    const error = commonUpdateTemplateTimelineCheck(
      isHandlingTemplateTimeline,
      status,
      timelineType,
      version,
      templateTimelineVersion,
      templateTimelineId,
      existTimeline,
      existTemplateTimeline
    );
    if (error) {
      return error;
    }
    if (
      templateTimelineVersion != null &&
      existTemplateTimeline != null &&
      existTemplateTimeline.templateTimelineVersion != null &&
      existTemplateTimeline.templateTimelineVersion >= templateTimelineVersion
    ) {
      // Throw error you can not update a template timeline version with an old version
      return {
        body: TEMPLATE_TIMELINE_VERSION_CONFLICT_MESSAGE,
        statusCode: 409,
      };
    }
  }
  return null;
};

export const checkIsUpdateFailureCases = (
  isHandlingTemplateTimeline: boolean,
  status: TimelineStatus | null | undefined,
  timelineType: TimelineTypeLiteral,
  version: string | null,
  templateTimelineVersion: number | null,
  templateTimelineId: string | null | undefined,
  existTimeline: TimelineSavedObject | null,
  existTemplateTimeline: TimelineSavedObject | null
) => {
  const error = isUpdatingStatus(
    isHandlingTemplateTimeline,
    status,
    existTimeline,
    existTemplateTimeline
  );
  if (error) {
    return {
      body: error,
      statusCode: 403,
    };
  }
  return commonUpdateCases(
    isHandlingTemplateTimeline,
    status,
    timelineType,
    version,
    templateTimelineVersion,
    templateTimelineId,
    existTimeline,
    existTemplateTimeline
  );
};

export const checkIsCreateFailureCases = (
  isHandlingTemplateTimeline: boolean,
  status: TimelineStatus,
  timelineType: TimelineTypeLiteral,
  version: string | null,
  templateTimelineVersion: number | null,
  templateTimelineId: string | null | undefined,
  existTimeline: TimelineSavedObject | null,
  existTemplateTimeline: TimelineSavedObject | null
) => {
  if (!isHandlingTemplateTimeline && existTimeline != null) {
    return {
      body: CREATE_TIMELINE_ERROR_MESSAGE,
      statusCode: 405,
    };
  } else if (isHandlingTemplateTimeline) {
    return createTemplateTimelineCheck(
      isHandlingTemplateTimeline,
      status,
      timelineType,
      version,
      templateTimelineVersion,
      templateTimelineId,
      existTimeline,
      existTemplateTimeline
    );
  } else {
    return null;
  }
};

export const checkIsCreateViaImportFailureCases = (
  isHandlingTemplateTimeline: boolean,
  status: TimelineStatus | null | undefined,
  timelineType: TimelineTypeLiteral,
  version: string | null,
  templateTimelineVersion: number | null,
  templateTimelineId: string | null | undefined,
  existTimeline: TimelineSavedObject | null,
  existTemplateTimeline: TimelineSavedObject | null
) => {
  if (status === TimelineStatus.draft) {
    return {
      body: CREATE_WITH_INVALID_STATUS_ERROR_MESSAGE,
      statusCode: 405,
    };
  }

  if (!isHandlingTemplateTimeline) {
    if (existTimeline != null) {
      return {
        body: getImportExistingTimelineError(existTimeline.savedObjectId),
        statusCode: 405,
      };
    }
  } else {
    if (existTemplateTimeline != null) {
      // Throw error to create template timeline in patch
      return {
        body: getImportExistingTimelineError(existTemplateTimeline.savedObjectId),
        statusCode: 405,
      };
    }
  }

  return null;
};
