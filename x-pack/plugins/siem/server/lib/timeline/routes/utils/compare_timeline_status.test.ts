/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TimelineType } from '../../../../../common/types/timeline';
import { FrameworkRequest } from '../../../framework';

import {
  mockUniqueParsedObjects,
  mockUniqueParsedTemplateTimelineObjects,
  mockGetTemplateTimelineValue,
  mockGetTimelineValue,
} from '../__mocks__/import_timelines';

describe('CompareTimelineStatus', () => {
  describe('timeline', () => {
    describe('given timeline exists', () => {
      const mockGetTimeline: jest.Mock = jest.fn();
      const mockGetTemplateTimeline: jest.Mock = jest.fn();
      let timelineObj;
      let status: {
        isCreatable: boolean;
        isCreatableViaImport: boolean;
        isUpdatable: boolean;
        isUpdatableViaImport: boolean;
        isHandlingTemplateTimeline: boolean;
      };

      afterEach(() => {
        jest.clearAllMocks();
      });

      afterAll(() => {
        jest.resetModules();
      });

      beforeEach(async () => {
        jest.doMock('../../saved_object', () => {
          return {
            getTimeline: mockGetTimeline.mockReturnValue(mockGetTimelineValue),
            getTimelineByTemplateTimelineId: mockGetTemplateTimeline.mockReturnValue({
              timeline: [],
            }),
          };
        });
        const CompareTimelineStatus = jest.requireActual('./compare_timeline_status')
          .CompareTimelineStatus;

        timelineObj = new CompareTimelineStatus({
          timelineInput: {
            id: mockUniqueParsedObjects[0].savedObjectId,
            type: TimelineType.default,
            version: mockUniqueParsedObjects[0].version,
          },
          timelineType: TimelineType.default,
          templateTimelineInput: {
            id: mockUniqueParsedTemplateTimelineObjects[0].templateTimelineId,
            type: TimelineType.template,
            version: mockUniqueParsedTemplateTimelineObjects[0].templateTimelineVersion,
          },
          frameworkRequest: {} as FrameworkRequest,
        });

        status = await timelineObj.init();
      });

      test('should get timeline', () => {
        expect(mockGetTimeline).toHaveBeenCalled();
      });

      test('should get templateTimeline', () => {
        expect(mockGetTemplateTimeline).toHaveBeenCalled();
      });

      test('should not creatable', () => {
        expect(status.isCreatable).toEqual(false);
      });

      test('should not CreatableViaImport', () => {
        expect(status.isCreatableViaImport).toEqual(false);
      });

      test('should be Updatable', () => {
        expect(status.isUpdatable).toEqual(true);
      });

      test('should not be UpdatableViaImport', () => {
        expect(status.isUpdatableViaImport).toEqual(false);
      });

      test('should indicate we are handling a timeline', () => {
        expect(status.isHandlingTemplateTimeline).toEqual(false);
      });
    });

    describe('given timeline does NOT exists', () => {
      const mockGetTimeline: jest.Mock = jest.fn();
      const mockGetTemplateTimeline: jest.Mock = jest.fn();
      let timelineObj;
      let status: {
        isCreatable: boolean;
        isCreatableViaImport: boolean;
        isUpdatable: boolean;
        isUpdatableViaImport: boolean;
        isHandlingTemplateTimeline: boolean;
      };

      afterEach(() => {
        jest.clearAllMocks();
      });

      afterAll(() => {
        jest.resetModules();
      });

      beforeEach(async () => {
        jest.doMock('../../saved_object', () => {
          return {
            getTimeline: mockGetTimeline.mockReturnValue(null),
            getTimelineByTemplateTimelineId: mockGetTemplateTimeline.mockReturnValue({
              timeline: [],
            }),
          };
        });
        const CompareTimelineStatus = jest.requireActual('./compare_timeline_status')
          .CompareTimelineStatus;

        timelineObj = new CompareTimelineStatus({
          timelineInput: {
            id: mockUniqueParsedObjects[0].savedObjectId,
            type: TimelineType.default,
            version: mockUniqueParsedObjects[0].version,
          },
          timelineType: TimelineType.default,
          templateTimelineInput: {
            id: mockUniqueParsedTemplateTimelineObjects[0].templateTimelineId,
            type: TimelineType.template,
            version: mockUniqueParsedTemplateTimelineObjects[0].templateTimelineVersion,
          },
          frameworkRequest: {} as FrameworkRequest,
        });

        status = await timelineObj.init();
      });

      test('should get timeline', () => {
        expect(mockGetTimeline).toHaveBeenCalled();
      });

      test('should get templateTimeline', () => {
        expect(mockGetTemplateTimeline).toHaveBeenCalled();
      });

      test('should be creatable', () => {
        expect(status.isCreatable).toEqual(true);
      });

      test('should be CreatableViaImport', () => {
        expect(status.isCreatableViaImport).toEqual(true);
      });

      test('should be Updatable', () => {
        expect(status.isUpdatable).toEqual(false);
      });

      test('should not be UpdatableViaImport', () => {
        expect(status.isUpdatableViaImport).toEqual(false);
      });

      test('should indicate we are handling a timeline', () => {
        expect(status.isHandlingTemplateTimeline).toEqual(false);
      });
    });
  });

  describe('template timeline', () => {
    describe('given template timeline exists', () => {
      const mockGetTimeline: jest.Mock = jest.fn();
      const mockGetTemplateTimeline: jest.Mock = jest.fn();

      let timelineObj;
      let status: {
        isCreatable: boolean;
        isCreatableViaImport: boolean;
        isUpdatable: boolean;
        isUpdatableViaImport: boolean;
        isHandlingTemplateTimeline: boolean;
      };

      beforeEach(async () => {
        jest.doMock('../../saved_object', () => {
          return {
            getTimeline: mockGetTimeline.mockReturnValue(mockGetTemplateTimelineValue),
            getTimelineByTemplateTimelineId: mockGetTemplateTimeline.mockReturnValue({
              timeline: [mockGetTemplateTimelineValue],
            }),
          };
        });
        const CompareTimelineStatus = jest.requireActual('./compare_timeline_status')
          .CompareTimelineStatus;

        timelineObj = new CompareTimelineStatus({
          timelineInput: {
            id: mockUniqueParsedObjects[0].savedObjectId,
            type: TimelineType.default,
            version: mockUniqueParsedObjects[0].version,
          },
          timelineType: TimelineType.template,
          templateTimelineInput: {
            id: mockUniqueParsedTemplateTimelineObjects[0].templateTimelineId,
            type: TimelineType.template,
            version: mockUniqueParsedTemplateTimelineObjects[0].templateTimelineVersion,
          },
          frameworkRequest: {} as FrameworkRequest,
        });
        status = await timelineObj.init();
      });

      afterEach(() => {
        jest.clearAllMocks();
      });

      afterAll(() => {
        jest.resetModules();
      });

      test('should get timeline', () => {
        expect(mockGetTimeline).toHaveBeenCalled();
      });

      test('should get templateTimeline', () => {
        expect(mockGetTemplateTimeline).toHaveBeenCalled();
      });

      test('should not creatable', () => {
        expect(status.isCreatable).toEqual(false);
      });

      test('should not CreatableViaImport', () => {
        expect(status.isCreatableViaImport).toEqual(false);
      });

      test('should be Updatable', () => {
        expect(status.isUpdatable).toEqual(true);
      });

      test('should be UpdatableViaImport', () => {
        expect(status.isUpdatableViaImport).toEqual(true);
      });

      test('should indicate we are handling a template timeline', () => {
        expect(status.isHandlingTemplateTimeline).toEqual(true);
      });
    });

    describe('given template timeline does NOT exists', () => {
      const mockGetTimeline: jest.Mock = jest.fn();
      const mockGetTemplateTimeline: jest.Mock = jest.fn();
      let timelineObj;
      let status: {
        isCreatable: boolean;
        isCreatableViaImport: boolean;
        isUpdatable: boolean;
        isUpdatableViaImport: boolean;
        isHandlingTemplateTimeline: boolean;
      };

      afterEach(() => {
        jest.clearAllMocks();
      });

      afterAll(() => {
        jest.resetModules();
      });

      beforeEach(async () => {
        jest.doMock('../../saved_object', () => {
          return {
            getTimeline: mockGetTimeline,
            getTimelineByTemplateTimelineId: mockGetTemplateTimeline,
          };
        });
        const CompareTimelineStatus = jest.requireActual('./compare_timeline_status')
          .CompareTimelineStatus;

        timelineObj = new CompareTimelineStatus({
          timelineInput: {
            id: mockUniqueParsedObjects[0].savedObjectId,
            type: TimelineType.default,
            version: mockUniqueParsedObjects[0].version,
          },
          timelineType: TimelineType.template,
          templateTimelineInput: {
            id: mockUniqueParsedTemplateTimelineObjects[0].templateTimelineId,
            type: TimelineType.template,
            version: mockUniqueParsedTemplateTimelineObjects[0].templateTimelineVersion,
          },
          frameworkRequest: {} as FrameworkRequest,
        });
        status = await timelineObj.init();
      });

      test('should get timeline', () => {
        expect(mockGetTimeline).toHaveBeenCalled();
      });

      test('should get templateTimeline', () => {
        expect(mockGetTemplateTimeline).toHaveBeenCalled();
      });

      test('should be creatable', () => {
        expect(status.isCreatable).toEqual(true);
      });

      test('should be CreatableViaImport', () => {
        expect(status.isCreatableViaImport).toEqual(true);
      });

      test('should be Updatable', () => {
        expect(status.isUpdatable).toEqual(false);
      });

      test('should be UpdatableViaImport', () => {
        expect(status.isUpdatableViaImport).toEqual(false);
      });

      test('should indicate we are handling a template timeline', () => {
        expect(status.isHandlingTemplateTimeline).toEqual(true);
      });
    });
  });
});
