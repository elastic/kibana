/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  commonFailureChecker,
  checkIsCreateFailureCases,
  checkIsUpdateFailureCases,
  checkIsCreateViaImportFailureCases,
  EMPTY_TITLE_ERROR_MESSAGE,
  UPDATE_STATUS_ERROR_MESSAGE,
  CREATE_TIMELINE_ERROR_MESSAGE,
  CREATE_TEMPLATE_TIMELINE_ERROR_MESSAGE,
  CREATE_TEMPLATE_TIMELINE_WITHOUT_VERSION_ERROR_MESSAGE,
  NO_MATCH_ID_ERROR_MESSAGE,
  NO_MATCH_VERSION_ERROR_MESSAGE,
  NO_MATCH_TEMPLATE_VERSION_ERROR_MESSAGE,
  NOT_ALLOW_UPDATE_TIMELINE_TYPE_ERROR_MESSAGE,
  UPDATE_TEMPLATE_TIMELINE_ERROR_MESSAGE,
  CREATE_WITH_INVALID_STATUS_ERROR_MESSAGE,
  getImportExistingTimelineError,
  checkIsUpdateViaImportFailureCases,
  NOT_ALLOW_UPDATE_STATUS_ERROR_MESSAGE,
  TEMPLATE_TIMELINE_VERSION_CONFLICT_MESSAGE,
} from './failure_cases';
import type { TimelineSavedObject } from '../../../../common/api/timeline';
import { TimelineStatus, TimelineType } from '../../../../common/api/timeline';
import { mockGetTimelineValue, mockGetTemplateTimelineValue } from '../__mocks__/import_timelines';

describe('failure cases', () => {
  describe('commonFailureChecker', () => {
    test('If timeline type is draft, it should not return error if title is not given', () => {
      const result = commonFailureChecker(TimelineStatus.draft, null);

      expect(result).toBeNull();
    });

    test('If timeline type is active, it should return error if title is not given', () => {
      const result = commonFailureChecker(TimelineStatus.active, null);

      expect(result).toEqual({
        body: EMPTY_TITLE_ERROR_MESSAGE,
        statusCode: 405,
      });
    });

    test('If timeline type is immutable, it should return error if title is not given', () => {
      const result = commonFailureChecker(TimelineStatus.immutable, null);

      expect(result).toEqual({
        body: EMPTY_TITLE_ERROR_MESSAGE,
        statusCode: 405,
      });
    });

    test('If timeline type is not a draft, it should return no error if title is given', () => {
      const result = commonFailureChecker(TimelineStatus.active, 'title');

      expect(result).toBeNull();
    });
  });

  describe('checkIsCreateFailureCases', () => {
    test('Should return error if trying to create a timeline that is already exist', () => {
      const isHandlingTemplateTimeline = false;
      const version = null;
      const templateTimelineVersion = null;
      const templateTimelineId = null;
      const existTimeline = mockGetTimelineValue as TimelineSavedObject;
      const existTemplateTimeline = null;
      const result = checkIsCreateFailureCases(
        isHandlingTemplateTimeline,
        TimelineStatus.active,
        TimelineType.default,
        version,
        templateTimelineVersion,
        templateTimelineId,
        existTimeline,
        existTemplateTimeline
      );

      expect(result).toEqual({
        body: CREATE_TIMELINE_ERROR_MESSAGE,
        statusCode: 405,
      });
    });

    test('Should return error if trying to create a timeline template that is already exist', () => {
      const isHandlingTemplateTimeline = true;
      const version = null;
      const templateTimelineVersion = 1;
      const templateTimelineId = 'template-timeline-id-one';
      const existTimeline = null;
      const existTemplateTimeline = mockGetTemplateTimelineValue as TimelineSavedObject;
      const result = checkIsCreateFailureCases(
        isHandlingTemplateTimeline,
        TimelineStatus.active,
        TimelineType.template,
        version,
        templateTimelineVersion,
        templateTimelineId,
        existTimeline,
        existTemplateTimeline
      );

      expect(result).toEqual({
        body: CREATE_TEMPLATE_TIMELINE_ERROR_MESSAGE,
        statusCode: 405,
      });
    });

    test('Should return error if trying to create a timeline template without providing templateTimelineVersion', () => {
      const isHandlingTemplateTimeline = true;
      const version = null;
      const templateTimelineVersion = null;
      const templateTimelineId = 'template-timeline-id-one';
      const existTimeline = null;
      const existTemplateTimeline = null;
      const result = checkIsCreateFailureCases(
        isHandlingTemplateTimeline,
        TimelineStatus.active,
        TimelineType.template,
        version,
        templateTimelineVersion,
        templateTimelineId,
        existTimeline,
        existTemplateTimeline
      );

      expect(result).toEqual({
        body: CREATE_TEMPLATE_TIMELINE_WITHOUT_VERSION_ERROR_MESSAGE,
        statusCode: 403,
      });
    });
  });

  describe('checkIsUpdateFailureCases', () => {
    test('Should return error if trying to update status field of an existing immutable timeline', () => {
      const isHandlingTemplateTimeline = false;
      const version = mockGetTimelineValue.version;
      const templateTimelineVersion = null;
      const templateTimelineId = null;
      const existTimeline = {
        ...(mockGetTimelineValue as TimelineSavedObject),
        status: TimelineStatus.immutable,
      };
      const existTemplateTimeline = null;
      const result = checkIsUpdateFailureCases(
        isHandlingTemplateTimeline,
        TimelineStatus.active,
        TimelineType.default,
        version,
        templateTimelineVersion,
        templateTimelineId,
        existTimeline,
        existTemplateTimeline
      );

      expect(result).toEqual({
        body: UPDATE_STATUS_ERROR_MESSAGE,
        statusCode: 403,
      });
    });

    test('Should return error if trying to update status field of an existing immutable timeline template', () => {
      const isHandlingTemplateTimeline = true;
      const version = mockGetTemplateTimelineValue.version;
      const templateTimelineVersion = mockGetTemplateTimelineValue.templateTimelineVersion;
      const templateTimelineId = mockGetTemplateTimelineValue.templateTimelineId;
      const existTimeline = null;
      const existTemplateTimeline = {
        ...(mockGetTemplateTimelineValue as TimelineSavedObject),
        status: TimelineStatus.immutable,
      };
      const result = checkIsUpdateFailureCases(
        isHandlingTemplateTimeline,
        TimelineStatus.active,
        TimelineType.template,
        version,
        templateTimelineVersion,
        templateTimelineId,
        existTimeline,
        existTemplateTimeline
      );

      expect(result).toEqual({
        body: UPDATE_STATUS_ERROR_MESSAGE,
        statusCode: 403,
      });
    });

    test('should return error if trying to update timelineType field of an existing timeline template', () => {
      const isHandlingTemplateTimeline = true;
      const version = mockGetTemplateTimelineValue.version;
      const templateTimelineVersion = mockGetTemplateTimelineValue.templateTimelineVersion;
      const templateTimelineId = mockGetTemplateTimelineValue.templateTimelineId;
      const existTimeline = null;
      const existTemplateTimeline = mockGetTemplateTimelineValue as TimelineSavedObject;
      const result = checkIsUpdateFailureCases(
        isHandlingTemplateTimeline,
        TimelineStatus.active,
        TimelineType.default,
        version,
        templateTimelineVersion,
        templateTimelineId,
        existTimeline,
        existTemplateTimeline
      );

      expect(result).toEqual({
        body: NOT_ALLOW_UPDATE_TIMELINE_TYPE_ERROR_MESSAGE,
        statusCode: 403,
      });
    });

    test('should return error if trying to update a timeline template that does not exist', () => {
      const isHandlingTemplateTimeline = true;
      const version = mockGetTemplateTimelineValue.version;
      const templateTimelineVersion = mockGetTemplateTimelineValue.templateTimelineVersion;
      const templateTimelineId = mockGetTemplateTimelineValue.templateTimelineId;
      const existTimeline = null;
      const existTemplateTimeline = null;
      const result = checkIsUpdateFailureCases(
        isHandlingTemplateTimeline,
        TimelineStatus.active,
        TimelineType.default,
        version,
        templateTimelineVersion,
        templateTimelineId,
        existTimeline,
        existTemplateTimeline
      );

      expect(result).toEqual({
        body: UPDATE_TEMPLATE_TIMELINE_ERROR_MESSAGE,
        statusCode: 405,
      });
    });

    test('should return error if there is no matched timeline found by given templateTimelineId', () => {
      const isHandlingTemplateTimeline = true;
      const version = mockGetTemplateTimelineValue.version;
      const templateTimelineVersion = mockGetTemplateTimelineValue.templateTimelineVersion;
      const templateTimelineId = mockGetTemplateTimelineValue.templateTimelineId;
      const existTimeline = {
        ...(mockGetTemplateTimelineValue as TimelineSavedObject),
        savedObjectId: 'someOtherId',
      };
      const existTemplateTimeline = mockGetTemplateTimelineValue as TimelineSavedObject;
      const result = checkIsUpdateFailureCases(
        isHandlingTemplateTimeline,
        TimelineStatus.active,
        TimelineType.template,
        version,
        templateTimelineVersion,
        templateTimelineId,
        existTimeline,
        existTemplateTimeline
      );

      expect(result).toEqual({
        body: NO_MATCH_ID_ERROR_MESSAGE,
        statusCode: 409,
      });
    });

    test('should return error if given version field is defferent from existing version of timeline template', () => {
      const isHandlingTemplateTimeline = true;
      const version = 'xxx';
      const templateTimelineVersion = mockGetTemplateTimelineValue.templateTimelineVersion;
      const templateTimelineId = mockGetTemplateTimelineValue.templateTimelineId;
      const existTimeline = null;
      const existTemplateTimeline = mockGetTemplateTimelineValue as TimelineSavedObject;
      const result = checkIsUpdateFailureCases(
        isHandlingTemplateTimeline,
        TimelineStatus.active,
        TimelineType.template,
        version,
        templateTimelineVersion,
        templateTimelineId,
        existTimeline,
        existTemplateTimeline
      );

      expect(result).toEqual({
        body: NO_MATCH_TEMPLATE_VERSION_ERROR_MESSAGE,
        statusCode: 409,
      });
    });

    test('should return error if given version field is defferent from existing version of timeline', () => {
      const isHandlingTemplateTimeline = false;
      const version = 'xxx';
      const templateTimelineVersion = null;
      const templateTimelineId = null;
      const existTimeline = {
        ...(mockGetTemplateTimelineValue as TimelineSavedObject),
        savedObjectId: 'someOtherId',
      };
      const existTemplateTimeline = null;
      const result = checkIsUpdateFailureCases(
        isHandlingTemplateTimeline,
        TimelineStatus.active,
        TimelineType.template,
        version,
        templateTimelineVersion,
        templateTimelineId,
        existTimeline,
        existTemplateTimeline
      );

      expect(result).toEqual({
        body: NO_MATCH_VERSION_ERROR_MESSAGE,
        statusCode: 409,
      });
    });
  });

  describe('checkIsCreateViaImportFailureCases', () => {
    test('should return error if trying to create a draft timeline', () => {
      const isHandlingTemplateTimeline = true;
      const version = mockGetTemplateTimelineValue.version;
      const templateTimelineVersion = mockGetTemplateTimelineValue.templateTimelineVersion;
      const templateTimelineId = mockGetTemplateTimelineValue.templateTimelineId;
      const existTimeline = null;
      const existTemplateTimeline = mockGetTemplateTimelineValue as TimelineSavedObject;
      const result = checkIsCreateViaImportFailureCases(
        isHandlingTemplateTimeline,
        TimelineStatus.draft,
        TimelineType.template,
        version,
        templateTimelineVersion,
        templateTimelineId,
        existTimeline,
        existTemplateTimeline
      );

      expect(result).toEqual({
        body: CREATE_WITH_INVALID_STATUS_ERROR_MESSAGE,
        statusCode: 405,
      });
    });

    test('should return error if trying to create a timeline template which is already exist', () => {
      const isHandlingTemplateTimeline = true;
      const version = mockGetTemplateTimelineValue.version;
      const templateTimelineVersion = mockGetTemplateTimelineValue.templateTimelineVersion;
      const templateTimelineId = mockGetTemplateTimelineValue.templateTimelineId;
      const existTimeline = null;
      const existTemplateTimeline = mockGetTemplateTimelineValue as TimelineSavedObject;
      const result = checkIsCreateViaImportFailureCases(
        isHandlingTemplateTimeline,
        TimelineStatus.active,
        TimelineType.template,
        version,
        templateTimelineVersion,
        templateTimelineId,
        existTimeline,
        existTemplateTimeline
      );

      expect(result).toEqual({
        body: getImportExistingTimelineError(mockGetTimelineValue.savedObjectId),
        statusCode: 405,
      });
    });

    test('should return error if importe a timeline which is already exists', () => {
      const isHandlingTemplateTimeline = false;
      const version = mockGetTimelineValue.version;
      const templateTimelineVersion = null;
      const templateTimelineId = null;
      const existTimeline = mockGetTimelineValue as TimelineSavedObject;
      const existTemplateTimeline = null;
      const result = checkIsCreateViaImportFailureCases(
        isHandlingTemplateTimeline,
        TimelineStatus.active,
        TimelineType.default,
        version,
        templateTimelineVersion,
        templateTimelineId,
        existTimeline,
        existTemplateTimeline
      );

      expect(result).toEqual({
        body: getImportExistingTimelineError(mockGetTimelineValue.savedObjectId),
        statusCode: 405,
      });
    });
  });

  describe('checkIsUpdateViaImportFailureCases', () => {
    test('should return error if trying to update a timeline which does not exist', () => {
      const isHandlingTemplateTimeline = false;
      const version = mockGetTimelineValue.version;
      const templateTimelineVersion = null;
      const templateTimelineId = null;
      const existTimeline = mockGetTimelineValue as TimelineSavedObject;
      const existTemplateTimeline = null;
      const result = checkIsUpdateViaImportFailureCases(
        isHandlingTemplateTimeline,
        TimelineStatus.active,
        TimelineType.default,
        version,
        templateTimelineVersion,
        templateTimelineId,
        existTimeline,
        existTemplateTimeline
      );

      expect(result).toEqual({
        body: getImportExistingTimelineError(mockGetTimelineValue.savedObjectId),
        statusCode: 405,
      });
    });

    test('should return error if trying to update timelineType field of an existing timeline template', () => {
      const isHandlingTemplateTimeline = true;
      const version = mockGetTemplateTimelineValue.version;
      const templateTimelineVersion = mockGetTemplateTimelineValue.templateTimelineVersion;
      const templateTimelineId = mockGetTemplateTimelineValue.templateTimelineId;
      const existTimeline = null;
      const existTemplateTimeline = mockGetTemplateTimelineValue as TimelineSavedObject;
      const result = checkIsUpdateViaImportFailureCases(
        isHandlingTemplateTimeline,
        TimelineStatus.active,
        TimelineType.default,
        version,
        templateTimelineVersion,
        templateTimelineId,
        existTimeline,
        existTemplateTimeline
      );

      expect(result).toEqual({
        body: NOT_ALLOW_UPDATE_TIMELINE_TYPE_ERROR_MESSAGE,
        statusCode: 403,
      });
    });

    test('should return error if trying to update status field of an existing timeline template', () => {
      const isHandlingTemplateTimeline = true;
      const version = mockGetTemplateTimelineValue.version;
      const templateTimelineVersion = mockGetTemplateTimelineValue.templateTimelineVersion;
      const templateTimelineId = mockGetTemplateTimelineValue.templateTimelineId;
      const existTimeline = null;
      const existTemplateTimeline = mockGetTemplateTimelineValue as TimelineSavedObject;
      const result = checkIsUpdateViaImportFailureCases(
        isHandlingTemplateTimeline,
        TimelineStatus.immutable,
        TimelineType.template,
        version,
        templateTimelineVersion,
        templateTimelineId,
        existTimeline,
        existTemplateTimeline
      );

      expect(result).toEqual({
        body: NOT_ALLOW_UPDATE_STATUS_ERROR_MESSAGE,
        statusCode: 405,
      });
    });

    test('should return error if trying to update a timeline template that does not exist', () => {
      const isHandlingTemplateTimeline = true;
      const version = mockGetTemplateTimelineValue.version;
      const templateTimelineVersion = mockGetTemplateTimelineValue.templateTimelineVersion;
      const templateTimelineId = mockGetTemplateTimelineValue.templateTimelineId;
      const existTimeline = null;
      const existTemplateTimeline = null;
      const result = checkIsUpdateViaImportFailureCases(
        isHandlingTemplateTimeline,
        TimelineStatus.active,
        TimelineType.default,
        version,
        templateTimelineVersion,
        templateTimelineId,
        existTimeline,
        existTemplateTimeline
      );

      expect(result).toEqual({
        body: UPDATE_TEMPLATE_TIMELINE_ERROR_MESSAGE,
        statusCode: 405,
      });
    });

    test('should return error if there is no matched timeline found by given templateTimelineId', () => {
      const isHandlingTemplateTimeline = true;
      const version = mockGetTemplateTimelineValue.version;
      const templateTimelineVersion = mockGetTemplateTimelineValue.templateTimelineVersion;
      const templateTimelineId = mockGetTemplateTimelineValue.templateTimelineId;
      const existTimeline = {
        ...(mockGetTemplateTimelineValue as TimelineSavedObject),
        savedObjectId: 'someOtherId',
      };
      const existTemplateTimeline = mockGetTemplateTimelineValue as TimelineSavedObject;
      const result = checkIsUpdateViaImportFailureCases(
        isHandlingTemplateTimeline,
        TimelineStatus.active,
        TimelineType.template,
        version,
        templateTimelineVersion,
        templateTimelineId,
        existTimeline,
        existTemplateTimeline
      );

      expect(result).toEqual({
        body: NO_MATCH_ID_ERROR_MESSAGE,
        statusCode: 409,
      });
    });

    test('should return error if given version field is defferent from existing version of timeline template', () => {
      const isHandlingTemplateTimeline = true;
      const version = 'xxx';
      const templateTimelineVersion = mockGetTemplateTimelineValue.templateTimelineVersion;
      const templateTimelineId = mockGetTemplateTimelineValue.templateTimelineId;
      const existTimeline = null;
      const existTemplateTimeline = mockGetTemplateTimelineValue as TimelineSavedObject;
      const result = checkIsUpdateViaImportFailureCases(
        isHandlingTemplateTimeline,
        TimelineStatus.active,
        TimelineType.template,
        version,
        templateTimelineVersion,
        templateTimelineId,
        existTimeline,
        existTemplateTimeline
      );

      expect(result).toEqual({
        body: NO_MATCH_TEMPLATE_VERSION_ERROR_MESSAGE,
        statusCode: 409,
      });
    });

    test('should return error if given templateTimelineVersion field is less or equal to existing templateTimelineVersion of timeline template', () => {
      const isHandlingTemplateTimeline = true;
      const version = mockGetTemplateTimelineValue.version;
      const templateTimelineVersion = mockGetTemplateTimelineValue.templateTimelineVersion;
      const templateTimelineId = mockGetTemplateTimelineValue.templateTimelineId;
      const existTimeline = null;
      const existTemplateTimeline = mockGetTemplateTimelineValue as TimelineSavedObject;
      const result = checkIsUpdateViaImportFailureCases(
        isHandlingTemplateTimeline,
        TimelineStatus.active,
        TimelineType.template,
        version,
        templateTimelineVersion,
        templateTimelineId,
        existTimeline,
        existTemplateTimeline
      );

      expect(result).toEqual({
        body: TEMPLATE_TIMELINE_VERSION_CONFLICT_MESSAGE,
        statusCode: 409,
      });
    });
  });
});
