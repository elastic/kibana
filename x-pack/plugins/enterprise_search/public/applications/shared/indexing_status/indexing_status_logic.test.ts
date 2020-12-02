/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resetContext } from 'kea';

jest.mock('../http', () => ({
  HttpLogic: {
    values: { http: { get: jest.fn() } },
  },
}));
import { HttpLogic } from '../http';

jest.mock('../flash_messages', () => ({
  flashAPIErrors: jest.fn(),
}));
import { flashAPIErrors } from '../flash_messages';

import { IndexingStatusLogic } from './indexing_status_logic';

describe('IndexingStatusLogic', () => {
  let unmount: any;

  const mockStatusResponse = {
    percentageComplete: 50,
    numDocumentsWithErrors: 3,
    activeReindexJobId: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetContext({});
    unmount = IndexingStatusLogic.mount();
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
      (HttpLogic.values.http.get as jest.Mock).mockReturnValue(promise);

      IndexingStatusLogic.actions.fetchIndexingStatus({ statusPath, onComplete });
      jest.advanceTimersByTime(TIMEOUT);

      expect(HttpLogic.values.http.get).toHaveBeenCalledWith(statusPath);
      await promise;

      expect(setIndexingStatusSpy).toHaveBeenCalledWith(mockStatusResponse);
    });

    it('handles error', async () => {
      const promise = Promise.reject('An error occured');
      (HttpLogic.values.http.get as jest.Mock).mockReturnValue(promise);

      IndexingStatusLogic.actions.fetchIndexingStatus({ statusPath, onComplete });
      jest.advanceTimersByTime(TIMEOUT);

      try {
        await promise;
      } catch {
        // Do nothing
      }
      expect(flashAPIErrors).toHaveBeenCalledWith('An error occured');
    });

    it('handles indexing complete state', async () => {
      const promise = Promise.resolve({ ...mockStatusResponse, percentageComplete: 100 });
      (HttpLogic.values.http.get as jest.Mock).mockReturnValue(promise);
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
