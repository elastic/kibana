/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  defaultExpandedCards,
  EXPANDED_CARDS_STORAGE_KEY,
  FINISHED_CARDS_STORAGE_KEY,
  getStorageKeyBySpace,
  OnboardingStorage,
} from './storage';
import { CardId } from './types';
import type { MockStorage } from '../../../lib/local_storage/__mocks__';
import { storage } from '../../../lib/local_storage';

jest.mock('../../../lib/local_storage');

describe.each([['test'], [undefined]])('useStorage - spaceId: %s', (spaceId) => {
  const mockStorage = storage as unknown as MockStorage;
  const onboardingStorage = new OnboardingStorage(spaceId);
  const onboardingSteps = [
    CardId.createFirstProject,
    CardId.watchTheOverviewVideo,
    CardId.addIntegrations,
    CardId.viewDashboards,
    CardId.enablePrebuiltRules,
    CardId.viewAlerts,
  ];
  beforeEach(() => {
    // Clear the mocked storage object before each test
    mockStorage.clearMockStorageData();
    jest.clearAllMocks();
  });

  it('should return all finished cards from storage', () => {
    const finishedCardsStorageKey = getStorageKeyBySpace(FINISHED_CARDS_STORAGE_KEY, spaceId);

    mockStorage.set(finishedCardsStorageKey, [
      CardId.createFirstProject,
      CardId.addIntegrations,
      CardId.watchTheOverviewVideo,
    ]);
    expect(onboardingStorage.getAllFinishedCardsFromStorage()).toEqual([
      CardId.createFirstProject,
      CardId.addIntegrations,
      CardId.watchTheOverviewVideo,
    ]);
  });

  it('should add a finished card to storage', () => {
    const finishedCardsStorageKey = getStorageKeyBySpace(FINISHED_CARDS_STORAGE_KEY, spaceId);

    onboardingStorage.addFinishedCardToStorage(CardId.createFirstProject);
    expect(mockStorage.set).toHaveBeenCalledWith(finishedCardsStorageKey, [
      CardId.createFirstProject,
    ]);

    mockStorage.set(finishedCardsStorageKey, CardId.createFirstProject);
    onboardingStorage.addFinishedCardToStorage(CardId.createFirstProject);
    expect(mockStorage.set).toHaveBeenCalledWith(finishedCardsStorageKey, [
      CardId.createFirstProject,
    ]);
  });

  it('should remove a finished card from storage', () => {
    const finishedCardsStorageKey = getStorageKeyBySpace(FINISHED_CARDS_STORAGE_KEY, spaceId);
    mockStorage.set(finishedCardsStorageKey, [CardId.watchTheOverviewVideo]);

    onboardingStorage.removeFinishedCardFromStorage(CardId.watchTheOverviewVideo, onboardingSteps);
    expect(mockStorage.get(finishedCardsStorageKey)).toEqual([]);
  });

  it('should not remove a default finished cards from storage', () => {
    const finishedCardsStorageKey = getStorageKeyBySpace(FINISHED_CARDS_STORAGE_KEY, spaceId);

    mockStorage.set(finishedCardsStorageKey, [CardId.createFirstProject]);

    onboardingStorage.removeFinishedCardFromStorage(CardId.createFirstProject, onboardingSteps);
    expect(mockStorage.get(finishedCardsStorageKey)).toEqual([CardId.createFirstProject]);
  });

  it('should get all expanded cards from storage', () => {
    const expandedCardsStorageKey = getStorageKeyBySpace(EXPANDED_CARDS_STORAGE_KEY, spaceId);

    (mockStorage.get as jest.Mock).mockReturnValueOnce([CardId.createFirstProject]);
    const result = onboardingStorage.getAllExpandedCardsFromStorage();
    expect(mockStorage.get).toHaveBeenCalledWith(expandedCardsStorageKey);
    expect(result).toEqual([CardId.createFirstProject]);
  });

  it('should get default expanded cards from storage', () => {
    const expandedCardsStorageKey = getStorageKeyBySpace(EXPANDED_CARDS_STORAGE_KEY, spaceId);

    (mockStorage.get as jest.Mock).mockReturnValueOnce(null);
    const result = onboardingStorage.getAllExpandedCardsFromStorage();
    expect(mockStorage.get).toHaveBeenCalledWith(expandedCardsStorageKey);
    expect(result).toEqual(defaultExpandedCards);
  });

  it('should reset cards in storage', () => {
    const expandedCardsStorageKey = getStorageKeyBySpace(EXPANDED_CARDS_STORAGE_KEY, spaceId);

    (mockStorage.get as jest.Mock).mockReturnValueOnce([CardId.watchTheOverviewVideo]);
    onboardingStorage.resetAllExpandedCardsToStorage();
    expect(mockStorage.get(expandedCardsStorageKey)).toEqual([CardId.watchTheOverviewVideo]);
  });

  it('should add an expanded card to storage', () => {
    const expandedCardsStorageKey = getStorageKeyBySpace(EXPANDED_CARDS_STORAGE_KEY, spaceId);

    mockStorage.set(expandedCardsStorageKey, [
      CardId.createFirstProject,
      CardId.watchTheOverviewVideo,
    ]);
    onboardingStorage.addExpandedCardToStorage(CardId.watchTheOverviewVideo);
    expect(mockStorage.get(expandedCardsStorageKey)).toEqual([
      CardId.createFirstProject,
      CardId.watchTheOverviewVideo,
    ]);
  });

  it('should remove an expanded card from storage', () => {
    const expandedCardsStorageKey = getStorageKeyBySpace(EXPANDED_CARDS_STORAGE_KEY, spaceId);

    mockStorage.set(expandedCardsStorageKey, [CardId.watchTheOverviewVideo]);
    onboardingStorage.removeExpandedCardFromStorage(CardId.watchTheOverviewVideo);
    expect(mockStorage.get(expandedCardsStorageKey)).toEqual([]);
  });
});
