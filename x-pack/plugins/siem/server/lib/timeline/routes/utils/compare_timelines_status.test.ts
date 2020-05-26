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

import { CompareTimelinesStatus as TimelinesStatusType } from './compare_timelines_status';
import { EMPTY_TITLE_ERROR_MESSAGE } from './failure_cases';
import { TimelineStatusActions } from './common';

describe('CompareTimelinesStatus', () => {
  describe('timeline', () => {
    describe('given timeline exists', () => {
      const mockGetTimeline: jest.Mock = jest.fn();
      const mockGetTemplateTimeline: jest.Mock = jest.fn();
      let timelineObj: TimelinesStatusType;

      afterEach(() => {
        jest.clearAllMocks();
      });

      afterAll(() => {
        jest.resetModules();
      });

      beforeAll(() => {
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

        const CompareTimelinesStatus = jest.requireActual('./compare_timelines_status')
          .CompareTimelinesStatus;

        timelineObj = new CompareTimelinesStatus({
          timelineInput: {
            id: mockUniqueParsedObjects[0].savedObjectId,
            version: mockUniqueParsedObjects[0].version,
          },
          timelineType: TimelineType.default,
          title: mockUniqueParsedObjects[0].title,
          templateTimelineInput: {
            id: mockUniqueParsedTemplateTimelineObjects[0].templateTimelineId,
            version: mockUniqueParsedTemplateTimelineObjects[0].templateTimelineVersion,
          },
          frameworkRequest: {} as FrameworkRequest,
        });

        await timelineObj.init();
      });

      test('should get timeline', () => {
        expect(mockGetTimeline).toHaveBeenCalled();
      });

      test('should get templateTimeline', () => {
        expect(mockGetTemplateTimeline).toHaveBeenCalled();
      });

      test('should not creatable', () => {
        expect(timelineObj.isCreatable).toEqual(false);
      });

      test('should not CreatableViaImport', () => {
        expect(timelineObj.isCreatableViaImport).toEqual(false);
      });

      test('should be Updatable', () => {
        expect(timelineObj.isUpdatable).toEqual(true);
      });

      test('should not be UpdatableViaImport', () => {
        expect(timelineObj.isUpdatableViaImport).toEqual(false);
      });

      test('should indicate we are handling a timeline', () => {
        expect(timelineObj.isHandlingTemplateTimeline).toEqual(false);
      });
    });

    describe('given timeline does NOT exists', () => {
      const mockGetTimeline: jest.Mock = jest.fn();
      const mockGetTemplateTimeline: jest.Mock = jest.fn();
      let timelineObj: TimelinesStatusType;

      afterEach(() => {
        jest.clearAllMocks();
      });

      afterAll(() => {
        jest.resetModules();
      });

      beforeAll(() => {
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

        const CompareTimelinesStatus = jest.requireActual('./compare_timelines_status')
          .CompareTimelinesStatus;

        timelineObj = new CompareTimelinesStatus({
          timelineInput: {
            id: mockUniqueParsedObjects[0].savedObjectId,
            version: mockUniqueParsedObjects[0].version,
          },
          timelineType: TimelineType.default,
          title: mockUniqueParsedObjects[0].title,
          templateTimelineInput: {
            id: mockUniqueParsedTemplateTimelineObjects[0].templateTimelineId,
            version: mockUniqueParsedTemplateTimelineObjects[0].templateTimelineVersion,
          },
          frameworkRequest: {} as FrameworkRequest,
        });

        await timelineObj.init();
      });

      test('should get timeline', () => {
        expect(mockGetTimeline).toHaveBeenCalled();
      });

      test('should get templateTimeline', () => {
        expect(mockGetTemplateTimeline).toHaveBeenCalled();
      });

      test('should be creatable', () => {
        expect(timelineObj.isCreatable).toEqual(true);
      });

      test('should be CreatableViaImport', () => {
        expect(timelineObj.isCreatableViaImport).toEqual(true);
      });

      test('should be Updatable', () => {
        expect(timelineObj.isUpdatable).toEqual(false);
      });

      test('should not be UpdatableViaImport', () => {
        expect(timelineObj.isUpdatableViaImport).toEqual(false);
      });

      test('should indicate we are handling a timeline', () => {
        expect(timelineObj.isHandlingTemplateTimeline).toEqual(false);
      });
    });
  });

  describe('template timeline', () => {
    describe('given template timeline exists', () => {
      const mockGetTimeline: jest.Mock = jest.fn();
      const mockGetTemplateTimeline: jest.Mock = jest.fn();

      let timelineObj: TimelinesStatusType;

      beforeEach(async () => {
        jest.doMock('../../saved_object', () => ({
          getTimeline: mockGetTimeline.mockReturnValue(mockGetTemplateTimelineValue),
          getTimelineByTemplateTimelineId: mockGetTemplateTimeline.mockReturnValue({
            timeline: [mockGetTemplateTimelineValue],
          }),
        }));

        const CompareTimelinesStatus = jest.requireActual('./compare_timelines_status')
          .CompareTimelinesStatus;

        timelineObj = new CompareTimelinesStatus({
          timelineInput: {
            id: mockUniqueParsedObjects[0].savedObjectId,
            version: mockUniqueParsedObjects[0].version,
          },
          timelineType: TimelineType.template,
          title: mockUniqueParsedObjects[0].title,
          templateTimelineInput: {
            id: mockUniqueParsedTemplateTimelineObjects[0].templateTimelineId,
            version: mockUniqueParsedTemplateTimelineObjects[0].templateTimelineVersion,
          },
          frameworkRequest: {} as FrameworkRequest,
        });
        await timelineObj.init();
      });

      afterEach(() => {
        jest.clearAllMocks();
      });

      afterAll(() => {
        jest.resetModules();
      });

      beforeAll(() => {
        jest.resetModules();
      });

      test('should get timeline', () => {
        expect(mockGetTimeline).toHaveBeenCalled();
      });

      test('should get templateTimeline', () => {
        expect(mockGetTemplateTimeline).toHaveBeenCalled();
      });

      test('should not creatable', () => {
        expect(timelineObj.isCreatable).toEqual(false);
      });

      test('should not CreatableViaImport', () => {
        expect(timelineObj.isCreatableViaImport).toEqual(false);
      });

      test('should be Updatable', () => {
        expect(timelineObj.isUpdatable).toEqual(true);
      });

      test('should be UpdatableViaImport', () => {
        expect(timelineObj.isUpdatableViaImport).toEqual(true);
      });

      test('should indicate we are handling a template timeline', () => {
        expect(timelineObj.isHandlingTemplateTimeline).toEqual(true);
      });
    });

    describe('given template timeline does NOT exists', () => {
      const mockGetTimeline: jest.Mock = jest.fn();
      const mockGetTemplateTimeline: jest.Mock = jest.fn();

      let timelineObj: TimelinesStatusType;

      afterEach(() => {
        jest.clearAllMocks();
      });

      afterAll(() => {
        jest.resetModules();
      });

      beforeAll(() => {
        jest.resetModules();
      });

      beforeEach(async () => {
        jest.doMock('../../saved_object', () => ({
          getTimeline: mockGetTimeline,
          getTimelineByTemplateTimelineId: mockGetTemplateTimeline,
        }));

        const CompareTimelinesStatus = jest.requireActual('./compare_timelines_status')
          .CompareTimelinesStatus;

        timelineObj = new CompareTimelinesStatus({
          timelineInput: {
            id: mockUniqueParsedObjects[0].savedObjectId,
            version: mockUniqueParsedObjects[0].version,
          },
          timelineType: TimelineType.template,
          title: mockUniqueParsedObjects[0].title,
          templateTimelineInput: {
            id: mockUniqueParsedTemplateTimelineObjects[0].templateTimelineId,
            version: mockUniqueParsedTemplateTimelineObjects[0].templateTimelineVersion,
          },
          frameworkRequest: {} as FrameworkRequest,
        });
        await timelineObj.init();
      });

      test('should get timeline', () => {
        expect(mockGetTimeline).toHaveBeenCalled();
      });

      test('should get templateTimeline', () => {
        expect(mockGetTemplateTimeline).toHaveBeenCalled();
      });

      test('should be creatable', () => {
        expect(timelineObj.isCreatable).toEqual(true);
      });

      test('should be CreatableViaImport', () => {
        expect(timelineObj.isCreatableViaImport).toEqual(true);
      });

      test('should be Updatable', () => {
        expect(timelineObj.isUpdatable).toEqual(false);
      });

      test('should be UpdatableViaImport', () => {
        expect(timelineObj.isUpdatableViaImport).toEqual(false);
      });

      test('should indicate we are handling a template timeline', () => {
        expect(timelineObj.isHandlingTemplateTimeline).toEqual(true);
      });
    });
  });

  describe(`Throw error if given title does NOT exists`, () => {
    const mockGetTimeline: jest.Mock = jest.fn();
    const mockGetTemplateTimeline: jest.Mock = jest.fn();
    let timelineObj: TimelinesStatusType;

    afterEach(() => {
      jest.clearAllMocks();
    });

    afterAll(() => {
      jest.resetModules();
    });

    beforeAll(() => {
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

      const CompareTimelinesStatus = jest.requireActual('./compare_timelines_status')
        .CompareTimelinesStatus;

      timelineObj = new CompareTimelinesStatus({
        timelineInput: {
          id: mockUniqueParsedObjects[0].savedObjectId,
          type: TimelineType.default,
          version: mockUniqueParsedObjects[0].version,
        },
        timelineType: TimelineType.default,
        title: null,
        templateTimelineInput: {
          id: mockUniqueParsedTemplateTimelineObjects[0].templateTimelineId,
          type: TimelineType.template,
          version: mockUniqueParsedTemplateTimelineObjects[0].templateTimelineVersion,
        },
        frameworkRequest: {} as FrameworkRequest,
      });

      await timelineObj.init();
    });

    test(`create timeline`, () => {
      const error = timelineObj.checkIsFailureCases(TimelineStatusActions.create);
      expect(error?.body).toEqual(EMPTY_TITLE_ERROR_MESSAGE);
    });
  });
});
