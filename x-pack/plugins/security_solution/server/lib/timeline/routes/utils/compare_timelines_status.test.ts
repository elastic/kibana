/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TimelineType, TimelineStatus } from '../../../../../common/types/timeline';
import { FrameworkRequest } from '../../../framework';

import {
  mockUniqueParsedObjects,
  mockUniqueParsedTemplateTimelineObjects,
  mockGetTemplateTimelineValue,
  mockGetTimelineValue,
} from '../__mocks__/import_timelines';

import { CompareTimelinesStatus as TimelinesStatusType } from './compare_timelines_status';
import {
  EMPTY_TITLE_ERROR_MESSAGE,
  UPDATE_STATUS_ERROR_MESSAGE,
  UPDATE_TEMPLATE_TIMELINE_ERROR_MESSAGE,
  TEMPLATE_TIMELINE_VERSION_CONFLICT_MESSAGE,
  CREATE_TEMPLATE_TIMELINE_ERROR_MESSAGE,
  getImportExistingTimelineError,
} from './failure_cases';
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

  describe('timeline template', () => {
    describe('given timeline template exists', () => {
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

      test('should indicate we are handling a timeline template', () => {
        expect(timelineObj.isHandlingTemplateTimeline).toEqual(true);
      });
    });

    describe('given timeline template does NOT exists', () => {
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

      test('should throw no error on creatable', () => {
        expect(timelineObj.checkIsFailureCases(TimelineStatusActions.create)).toBeNull();
      });

      test('should be CreatableViaImport', () => {
        expect(timelineObj.isCreatableViaImport).toEqual(true);
      });

      test('should throw no error on CreatableViaImport', () => {
        expect(timelineObj.checkIsFailureCases(TimelineStatusActions.createViaImport)).toBeNull();
      });

      test('should not be Updatable', () => {
        expect(timelineObj.isUpdatable).toEqual(false);
      });

      test('should throw error when updat', () => {
        const error = timelineObj.checkIsFailureCases(TimelineStatusActions.update);
        expect(error?.body).toEqual(UPDATE_TEMPLATE_TIMELINE_ERROR_MESSAGE);
      });

      test('should not be UpdatableViaImport', () => {
        expect(timelineObj.isUpdatableViaImport).toEqual(false);
      });

      test('should throw error when UpdatableViaImport', () => {
        const error = timelineObj.checkIsFailureCases(TimelineStatusActions.updateViaImport);
        expect(error?.body).toEqual(UPDATE_TEMPLATE_TIMELINE_ERROR_MESSAGE);
      });

      test('should indicate we are handling a timeline template', () => {
        expect(timelineObj.isHandlingTemplateTimeline).toEqual(true);
      });
    });
  });

  describe(`Throw error if given title does NOT exists`, () => {
    describe('timeline', () => {
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

      test(`should not be creatable`, () => {
        expect(timelineObj.isCreatable).toEqual(false);
      });

      test(`throw error on create`, () => {
        const error = timelineObj.checkIsFailureCases(TimelineStatusActions.create);
        expect(error?.body).toEqual(EMPTY_TITLE_ERROR_MESSAGE);
      });

      test(`should not be creatable via import`, () => {
        expect(timelineObj.isCreatableViaImport).toEqual(false);
      });

      test(`throw error when create via import`, () => {
        const error = timelineObj.checkIsFailureCases(TimelineStatusActions.createViaImport);
        expect(error?.body).toEqual(EMPTY_TITLE_ERROR_MESSAGE);
      });

      test(`should not be updatable`, () => {
        expect(timelineObj.isUpdatable).toEqual(false);
      });

      test(`throw error when update`, () => {
        const error = timelineObj.checkIsFailureCases(TimelineStatusActions.update);
        expect(error?.body).toEqual(EMPTY_TITLE_ERROR_MESSAGE);
      });

      test(`should not be updatable via import`, () => {
        expect(timelineObj.isUpdatableViaImport).toEqual(false);
      });
    });

    describe('timeline template', () => {
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

      test(`should not be creatable`, () => {
        expect(timelineObj.isCreatable).toEqual(false);
      });

      test(`throw error on create`, () => {
        const error = timelineObj.checkIsFailureCases(TimelineStatusActions.create);
        expect(error?.body).toEqual(EMPTY_TITLE_ERROR_MESSAGE);
      });

      test(`should not be creatable via import`, () => {
        expect(timelineObj.isCreatableViaImport).toEqual(false);
      });

      test(`throw error when create via import`, () => {
        const error = timelineObj.checkIsFailureCases(TimelineStatusActions.createViaImport);
        expect(error?.body).toEqual(EMPTY_TITLE_ERROR_MESSAGE);
      });

      test(`should not be updatable`, () => {
        expect(timelineObj.isUpdatable).toEqual(false);
      });

      test(`throw error when update`, () => {
        const error = timelineObj.checkIsFailureCases(TimelineStatusActions.update);
        expect(error?.body).toEqual(EMPTY_TITLE_ERROR_MESSAGE);
      });

      test(`should not be updatable via import`, () => {
        expect(timelineObj.isUpdatableViaImport).toEqual(false);
      });

      test(`throw error when update via import`, () => {
        const error = timelineObj.checkIsFailureCases(TimelineStatusActions.updateViaImport);
        expect(error?.body).toEqual(EMPTY_TITLE_ERROR_MESSAGE);
      });
    });
  });

  describe(`Throw error if timeline status is updated`, () => {
    describe('immutable timeline', () => {
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
            getTimeline: mockGetTimeline.mockReturnValue({
              ...mockGetTimelineValue,
              status: TimelineStatus.immutable,
            }),
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
          title: 'mock title',
          status: TimelineStatus.immutable,
          templateTimelineInput: {
            id: mockUniqueParsedTemplateTimelineObjects[0].templateTimelineId,
            type: TimelineType.template,
            version: mockUniqueParsedTemplateTimelineObjects[0].templateTimelineVersion,
          },
          frameworkRequest: {} as FrameworkRequest,
        });

        await timelineObj.init();
      });

      test(`should not be updatable if existing status is immutable`, () => {
        expect(timelineObj.isUpdatable).toBe(false);
      });

      test(`should throw error when update`, () => {
        const error = timelineObj.checkIsFailureCases(TimelineStatusActions.update);
        expect(error?.body).toEqual(UPDATE_STATUS_ERROR_MESSAGE);
      });

      test(`should not be updatable via import if existing status is immutable`, () => {
        expect(timelineObj.isUpdatableViaImport).toBe(false);
      });

      test(`should throw error when update via import`, () => {
        const error = timelineObj.checkIsFailureCases(TimelineStatusActions.updateViaImport);
        expect(error?.body).toEqual(
          getImportExistingTimelineError(mockUniqueParsedObjects[0].savedObjectId)
        );
      });
    });

    describe('immutable timeline template', () => {
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
            getTimeline: mockGetTimeline.mockReturnValue({
              ...mockGetTemplateTimelineValue,
              status: TimelineStatus.immutable,
            }),
            getTimelineByTemplateTimelineId: mockGetTemplateTimeline.mockReturnValue({
              timeline: [{ ...mockGetTemplateTimelineValue, status: TimelineStatus.immutable }],
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
          status: TimelineStatus.immutable,
          timelineType: TimelineType.template,
          title: 'mock title',
          templateTimelineInput: {
            id: mockUniqueParsedTemplateTimelineObjects[0].templateTimelineId,
            type: TimelineType.template,
            version: mockUniqueParsedTemplateTimelineObjects[0].templateTimelineVersion,
          },
          frameworkRequest: {} as FrameworkRequest,
        });

        await timelineObj.init();
      });

      test(`should not be able to update`, () => {
        expect(timelineObj.isUpdatable).toEqual(false);
      });

      test(`should not throw error when update`, () => {
        const error = timelineObj.checkIsFailureCases(TimelineStatusActions.update);
        expect(error?.body).toEqual(UPDATE_STATUS_ERROR_MESSAGE);
      });

      test(`should not be able to update via import`, () => {
        expect(timelineObj.isUpdatableViaImport).toEqual(true);
      });

      test(`should not throw error when update via import`, () => {
        const error = timelineObj.checkIsFailureCases(TimelineStatusActions.updateViaImport);
        expect(error?.body).toBeUndefined();
      });
    });
  });

  describe('If create timeline template without timeline template id', () => {
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
          id: null,
          version: mockUniqueParsedTemplateTimelineObjects[0].templateTimelineVersion,
        },
        frameworkRequest: {} as FrameworkRequest,
      });
      await timelineObj.init();
    });

    test('should not be creatable', () => {
      expect(timelineObj.isCreatable).toEqual(true);
    });

    test(`throw no error when create`, () => {
      const error = timelineObj.checkIsFailureCases(TimelineStatusActions.create);
      expect(error?.body).toBeUndefined();
    });

    test('should be Creatable via import', () => {
      expect(timelineObj.isCreatableViaImport).toEqual(true);
    });

    test(`throw no error when CreatableViaImport`, () => {
      const error = timelineObj.checkIsFailureCases(TimelineStatusActions.createViaImport);
      expect(error?.body).toBeUndefined();
    });
  });

  describe('Throw error if timeline template version is conflict when update via import', () => {
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
          version: mockGetTemplateTimelineValue.templateTimelineVersion,
        },
        frameworkRequest: {} as FrameworkRequest,
      });
      await timelineObj.init();
    });

    test('should not be creatable', () => {
      expect(timelineObj.isCreatable).toEqual(false);
    });

    test(`throw error when create`, () => {
      const error = timelineObj.checkIsFailureCases(TimelineStatusActions.create);
      expect(error?.body).toEqual(CREATE_TEMPLATE_TIMELINE_ERROR_MESSAGE);
    });

    test('should not be Creatable via import', () => {
      expect(timelineObj.isCreatableViaImport).toEqual(false);
    });

    test(`throw error when CreatableViaImport`, () => {
      const error = timelineObj.checkIsFailureCases(TimelineStatusActions.createViaImport);
      expect(error?.body).toEqual(
        getImportExistingTimelineError(mockUniqueParsedObjects[0].savedObjectId)
      );
    });

    test('should be updatable', () => {
      expect(timelineObj.isUpdatable).toEqual(true);
    });

    test(`throw no error when update`, () => {
      const error = timelineObj.checkIsFailureCases(TimelineStatusActions.update);
      expect(error).toBeNull();
    });

    test('should not be updatable via import', () => {
      expect(timelineObj.isUpdatableViaImport).toEqual(false);
    });

    test(`throw error when UpdatableViaImport`, () => {
      const error = timelineObj.checkIsFailureCases(TimelineStatusActions.updateViaImport);
      expect(error?.body).toEqual(TEMPLATE_TIMELINE_VERSION_CONFLICT_MESSAGE);
    });
  });
});
