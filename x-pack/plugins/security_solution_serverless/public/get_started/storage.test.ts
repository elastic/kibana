/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultFinishedCards, FINISHED_CARDS_STORAGE_KEY, getStartedStorage } from './storage';
import { storage } from '../common/lib/storage';
import type { MockStorage } from '../common/lib/__mocks__/storage';
import { AddAndValidateData, QuickStart } from './types';

jest.mock('../common/lib/storage');

describe('useStorage', () => {
  const mockStorage = storage as unknown as MockStorage;
  beforeEach(() => {
    // Clear the mocked storage object before each test
    mockStorage.clearMockStorageData();
    jest.clearAllMocks();
  });

  it('should return default finished cards from storage', () => {
    expect(getStartedStorage.getAllFinishedCardsFromStorage()).toEqual(defaultFinishedCards);
  });

  it('should return all finished cards from storage', () => {
    const data = [QuickStart.createFirstProject, QuickStart.watchTheOverviewVideo];
    mockStorage.set(FINISHED_CARDS_STORAGE_KEY, data);
    expect(getStartedStorage.getAllFinishedCardsFromStorage()).toEqual(data);
  });

  it('should add a finished step to storage', () => {
    getStartedStorage.addFinishedCardToStorage(AddAndValidateData.addIntegration);
    expect(mockStorage.set).toHaveBeenCalledWith(FINISHED_CARDS_STORAGE_KEY, [
      ...defaultFinishedCards,
      AddAndValidateData.addIntegration,
    ]);
  });

  it('should remove a finished card from storage', () => {
    (mockStorage.get as jest.Mock).mockReturnValue([
      ...defaultFinishedCards,
      QuickStart.watchTheOverviewVideo,
    ]);

    getStartedStorage.removeFinishedCardFromStorage(QuickStart.watchTheOverviewVideo);
    expect(mockStorage.set).toHaveBeenCalledWith(FINISHED_CARDS_STORAGE_KEY, defaultFinishedCards);
  });

  it('should not remove a default finished card from storage', () => {
    getStartedStorage.removeFinishedCardFromStorage(QuickStart.createFirstProject);
    expect(mockStorage.set).not.toHaveBeenCalled();
  });
});
