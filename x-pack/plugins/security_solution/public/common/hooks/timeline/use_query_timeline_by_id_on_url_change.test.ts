/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQueryTimelineById } from '../../../timelines/components/open_timeline/helpers';
import { useQueryTimelineByIdOnUrlChange } from './use_query_timeline_by_id_on_url_change';
import { renderHook } from '@testing-library/react-hooks';
import { timelineDefaults } from '../../../timelines/store/defaults';

jest.mock('../use_experimental_features');

jest.mock('../../../timelines/components/open_timeline/helpers');

const mockFlyoutTimeline = jest
  .fn()
  .mockReturnValue({ timelineDefaults, savedObjectId: 'savedObjectId_12345' });
jest.mock('../use_selector', () => ({
  useShallowEqualSelector: () => mockFlyoutTimeline(),
}));

const mockUseLocation = jest.fn().mockReturnValue({ pathname: '/test', search: '?' });
jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');
  return {
    ...original,
    useLocation: () => mockUseLocation(),
  };
});

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

describe('queryTimelineByIdOnUrlChange', () => {
  const oldTestTimelineId = '04e8ffb0-2c2a-11ec-949c-39005af91f70';
  const newTestTimelineId = `${oldTestTimelineId}-newId`;
  const oldTimelineRisonSearchString = `?timeline=(activeTab:query,graphEventId:%27%27,id:%27${oldTestTimelineId}%27,isOpen:!t)`;
  const newTimelineRisonSearchString = `?timeline=(activeTab:query,graphEventId:%27%27,id:%27${newTestTimelineId}%27,isOpen:!t)`;
  const mockQueryTimelineById = jest.fn();

  beforeEach(() => {
    (useQueryTimelineById as jest.Mock).mockImplementation(() => mockQueryTimelineById);
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when an old timeline id exists, but a new id is given', () => {
    it('should call queryTimelineById', () => {
      mockUseLocation.mockReturnValue({ search: oldTimelineRisonSearchString });

      const { rerender } = renderHook(() => useQueryTimelineByIdOnUrlChange());
      mockUseLocation.mockReturnValue({ search: newTimelineRisonSearchString });
      jest.clearAllMocks();
      rerender();

      expect(mockQueryTimelineById).toHaveBeenCalledWith(
        expect.objectContaining({
          activeTimelineTab: 'query',
          duplicate: false,
          graphEventId: '',
          timelineId: newTestTimelineId,
          openTimeline: true,
        })
      );
    });
  });

  // You can only redirect or run into conflict scenarios when already viewing a timeline
  describe('when not actively on a page with timeline in the search field', () => {
    it('should not call queryTimelineById', () => {
      mockFlyoutTimeline.mockReturnValue({ timelineDefaults, savedObjectId: oldTestTimelineId });

      mockUseLocation.mockReturnValue({ search: '?random=foo' });

      const { rerender } = renderHook(() => useQueryTimelineByIdOnUrlChange());
      mockUseLocation.mockReturnValue({ search: newTimelineRisonSearchString });
      jest.clearAllMocks();
      rerender();

      expect(mockQueryTimelineById).not.toBeCalled();
    });
  });

  describe('when decode rison fails', () => {
    it('should not call queryTimelineById', () => {
      mockUseLocation.mockReturnValue({ search: oldTimelineRisonSearchString });

      const { rerender } = renderHook(() => useQueryTimelineByIdOnUrlChange());
      mockUseLocation.mockReturnValue({ search: '?foo=bar' });

      rerender();

      expect(mockQueryTimelineById).not.toBeCalled();
    });
  });

  describe('when search string has not changed', () => {
    it('should not call queryTimelineById', () => {
      mockUseLocation.mockReturnValue({ search: oldTimelineRisonSearchString });

      const { rerender } = renderHook(() => useQueryTimelineByIdOnUrlChange());
      jest.clearAllMocks();
      rerender();

      expect(mockQueryTimelineById).not.toBeCalled();
    });
  });

  describe('when new id is not provided', () => {
    it('should not call queryTimelineById', () => {
      mockUseLocation.mockReturnValue({ search: oldTimelineRisonSearchString });

      const { rerender } = renderHook(() => useQueryTimelineByIdOnUrlChange());
      mockUseLocation.mockReturnValue({ search: '?timeline=(activeTab:query)' }); // no id
      jest.clearAllMocks();
      rerender();

      expect(mockQueryTimelineById).not.toBeCalled();
    });
  });

  describe('when new id matches the data in redux', () => {
    it('should not call queryTimelineById', () => {
      mockFlyoutTimeline.mockReturnValue({ timelineDefaults, savedObjectId: newTestTimelineId });
      mockUseLocation.mockReturnValue({ search: oldTimelineRisonSearchString });

      const { rerender } = renderHook(() => useQueryTimelineByIdOnUrlChange());
      mockUseLocation.mockReturnValue({ search: newTimelineRisonSearchString });
      jest.clearAllMocks();
      rerender();

      expect(mockQueryTimelineById).not.toBeCalled();
    });
  });
});
