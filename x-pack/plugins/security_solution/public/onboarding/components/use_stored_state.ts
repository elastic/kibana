/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocalStorage } from 'react-use';
import type { OnboardingHubCardId } from '../constants';

const LocalStorageKey = {
  completeCards: 'ONBOARDING_HUB.COMPLETE_CARDS',
  expandedCard: 'ONBOARDING_HUB.EXPANDED_CARD',
  avcBannerDismissed: 'ONBOARDING_HUB.AVC_BANNER_DISMISSED',
} as const;

/**
 * Wrapper hook for useLocalStorage, but always returns the default value when not defined instead of `undefined`.
 */
const useDefinedLocalStorage = <T>(key: string, defaultValue: T) => {
  const [value, setValue] = useLocalStorage<T>(key);
  return [value ?? defaultValue, setValue] as const;
};

export const useStoredCompletedCardIds = (spaceId: string) =>
  useDefinedLocalStorage<OnboardingHubCardId[]>(`${LocalStorageKey.completeCards}.${spaceId}`, []);

export const useStoredExpandedCardId = (spaceId: string) =>
  useDefinedLocalStorage<OnboardingHubCardId | null>(
    `${LocalStorageKey.expandedCard}.${spaceId}`,
    null
  );

export const useStoredIsAVCBannerDismissed = () =>
  useDefinedLocalStorage<boolean>(`${LocalStorageKey.avcBannerDismissed}`, false);
