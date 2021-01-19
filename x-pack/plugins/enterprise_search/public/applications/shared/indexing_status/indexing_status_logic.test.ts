/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  LogicMounter,
  mockFlashMessageHelpers,
  mockHttpValues,
  expectedAsyncError,
} from '../../__mocks__';

import { IndexingStatusLogic } from './indexing_status_logic';

describe('IndexingStatusLogic', () => {
  const { mount, unmount } = new LogicMounter(IndexingStatusLogic);
  const { http } = mockHttpValues;
  const { flashAPIErrors } = mockFlashMessageHelpers;

  const mockStatusResponse = {
    percentageComplete: 50,
    numDocumentsWithErrors: 3,
    activeReindexJobId: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mount();
  });

  it('has expected default values', () => {
    expect(IndexingStatusLogic.values).toEqual({
      percentageComplete: 100,
      numDocumentsWithErrors: 0,
    });
  });

  describe('setIndexingStatus', () => {
    it('sets reducers', () => {
      IndexingStatusLogic.actions.setIndexingStatus(mockStatusResponse);

      expect(IndexingStatusLogic.values.percentageComplete).toEqual(
        mockStatusResponse.percentageComplete
      );
      expect(IndexingStatusLogic.values.numDocumentsWithErrors).toEqual(
        mockStatusResponse.numDocumentsWithErrors
      );
    });
  });

  describe('fetchIndexingStatus', () => {
    jest.useFakeTimers();
    const statusPath = '/api/workplace_search/path/123';
    const onComplete = jest.fn();
    const TIMEOUT = 3000;

    it('calls API and sets values', async () => {
      const setIndexingStatusSpy = jest.spyOn(IndexingStatusLogic.actions, 'setIndexingStatus');
      const promise = Promise.resolve(mockStatusResponse);
      http.get.mockReturnValue(promise);

      IndexingStatusLogic.actions.fetchIndexingStatus({ statusPath, onComplete });
      jest.advanceTimersByTime(TIMEOUT);

      expect(http.get).toHaveBeenCalledWith(statusPath);
      await promise;

      expect(setIndexingStatusSpy).toHaveBeenCalledWith(mockStatusResponse);
    });

    it('handles error', async () => {
      const promise = Promise.reject('An error occured');
      http.get.mockReturnValue(promise);

      IndexingStatusLogic.actions.fetchIndexingStatus({ statusPath, onComplete });
      jest.advanceTimersByTime(TIMEOUT);

      await expectedAsyncError(promise);

      expect(flashAPIErrors).toHaveBeenCalledWith('An error occured');
    });

    it('handles indexing complete state', async () => {
      const promise = Promise.resolve({ ...mockStatusResponse, percentageComplete: 100 });
      http.get.mockReturnValue(promise);
      IndexingStatusLogic.actions.fetchIndexingStatus({ statusPath, onComplete });
      jest.advanceTimersByTime(TIMEOUT);

      await promise;

      expect(clearInterval).toHaveBeenCalled();
      expect(onComplete).toHaveBeenCalledWith(mockStatusResponse.numDocumentsWithErrors);
    });

    it('handles unmounting', async () => {
      unmount();
      expect(clearInterval).toHaveBeenCalled();
    });
  });
});
