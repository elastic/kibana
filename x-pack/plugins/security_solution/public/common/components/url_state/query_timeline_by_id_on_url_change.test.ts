/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { queryTimelineById } from '../../../timelines/components/open_timeline/helpers';
import { queryTimelineByIdOnUrlChange } from './query_timeline_by_id_on_url_change';
import * as urlHelpers from './helpers';

jest.mock('../../../timelines/components/open_timeline/helpers');

describe('queryTimelineByIdOnUrlChange', () => {
  const oldTestTimelineId = '04e8ffb0-2c2a-11ec-949c-39005af91f70';
  const newTestTimelineId = `${oldTestTimelineId}-newId`;
  const oldTimelineRisonSearchString = `?timeline=(activeTab:query,graphEventId:%27%27,id:%27${oldTestTimelineId}%27,isOpen:!t)`;
  const newTimelineRisonSearchString = `?timeline=(activeTab:query,graphEventId:%27%27,id:%27${newTestTimelineId}%27,isOpen:!t)`;
  const mockUpdateTimeline = jest.fn();
  const mockUpdateTimelineIsLoading = jest.fn();
  const mockQueryTimelineById = jest.fn();
  beforeEach(() => {
    (queryTimelineById as jest.Mock).mockImplementation(mockQueryTimelineById);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when search strings are empty', () => {
    it('should not call queryTimelineById', () => {
      queryTimelineByIdOnUrlChange({
        oldSearch: '',
        search: '',
        timelineIdFromReduxStore: 'current-timeline-id',
        updateTimeline: mockUpdateTimeline,
        updateTimelineIsLoading: mockUpdateTimelineIsLoading,
      });

      expect(queryTimelineById).not.toBeCalled();
    });
  });

  describe('when search string has not changed', () => {
    it('should not call queryTimelineById', () => {
      queryTimelineByIdOnUrlChange({
        oldSearch: oldTimelineRisonSearchString,
        search: oldTimelineRisonSearchString,
        timelineIdFromReduxStore: 'timeline-id',
        updateTimeline: mockUpdateTimeline,
        updateTimelineIsLoading: mockUpdateTimelineIsLoading,
      });

      expect(queryTimelineById).not.toBeCalled();
    });
  });

  describe('when decode rison fails', () => {
    it('should not call queryTimelineById', () => {
      jest.spyOn(urlHelpers, 'decodeRisonUrlState').mockImplementationOnce(() => {
        throw new Error('Unable to decode');
      });

      queryTimelineByIdOnUrlChange({
        oldSearch: oldTimelineRisonSearchString,
        search: newTimelineRisonSearchString,
        timelineIdFromReduxStore: '',
        updateTimeline: mockUpdateTimeline,
        updateTimelineIsLoading: mockUpdateTimelineIsLoading,
      });

      expect(queryTimelineById).not.toBeCalled();
    });
  });

  describe('when new id is not provided', () => {
    it('should not call queryTimelineById', () => {
      queryTimelineByIdOnUrlChange({
        oldSearch: oldTimelineRisonSearchString,
        search: '?timeline=(activeTab:query)', // no id
        timelineIdFromReduxStore: newTestTimelineId,
        updateTimeline: mockUpdateTimeline,
        updateTimelineIsLoading: mockUpdateTimelineIsLoading,
      });

      expect(queryTimelineById).not.toBeCalled();
    });
  });

  describe('when new id matches the data in redux', () => {
    it('should not call queryTimelineById', () => {
      queryTimelineByIdOnUrlChange({
        oldSearch: oldTimelineRisonSearchString,
        search: newTimelineRisonSearchString,
        timelineIdFromReduxStore: newTestTimelineId,
        updateTimeline: mockUpdateTimeline,
        updateTimelineIsLoading: mockUpdateTimelineIsLoading,
      });

      expect(queryTimelineById).not.toBeCalled();
    });
  });

  // You can only redirect or run into conflict scenarios when already viewing a timeline
  describe('when not actively on a page with timeline in the search field', () => {
    it('should not call queryTimelineById', () => {
      queryTimelineByIdOnUrlChange({
        oldSearch: '?random=foo',
        search: newTimelineRisonSearchString,
        timelineIdFromReduxStore: oldTestTimelineId,
        updateTimeline: mockUpdateTimeline,
        updateTimelineIsLoading: mockUpdateTimelineIsLoading,
      });

      expect(queryTimelineById).not.toBeCalled();
    });
  });

  describe('when an old timeline id exists, but a new id is given', () => {
    it('should call queryTimelineById', () => {
      queryTimelineByIdOnUrlChange({
        oldSearch: oldTimelineRisonSearchString,
        search: newTimelineRisonSearchString,
        timelineIdFromReduxStore: oldTestTimelineId,
        updateTimeline: mockUpdateTimeline,
        updateTimelineIsLoading: mockUpdateTimelineIsLoading,
      });

      expect(queryTimelineById).toBeCalledWith({
        activeTimelineTab: 'query',
        duplicate: false,
        graphEventId: '',
        timelineId: newTestTimelineId,
        openTimeline: true,
        updateIsLoading: mockUpdateTimelineIsLoading,
        updateTimeline: mockUpdateTimeline,
      });
    });
  });
});
