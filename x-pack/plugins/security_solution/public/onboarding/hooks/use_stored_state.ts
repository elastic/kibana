/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useCallback, useMemo } from 'react';
import type { OnboardingCardId } from '../constants';
import type { IntegrationTabId } from '../components/onboarding_body/cards/integrations/types';
import type { CardSelectorListItem } from '../components/onboarding_body/cards/common/card_selector_list';
import { AlertsCardItemId } from '../components/onboarding_body/cards/alerts/types';
import { DashboardsCardItemId } from '../components/onboarding_body/cards/dashboards/types';
import { RulesCardItemId } from '../components/onboarding_body/cards/rules/types';

const LocalStorageKey = {
  avcBannerDismissed: 'ONBOARDING_HUB.AVC_BANNER_DISMISSED',
  videoVisited: 'ONBOARDING_HUB.VIDEO_VISITED',
  completeCards: 'ONBOARDING_HUB.COMPLETE_CARDS',
  expandedCard: 'ONBOARDING_HUB.EXPANDED_CARD',
  selectedIntegrationTabId: 'ONBOARDING_HUB.SELECTED_INTEGRATION_TAB_ID',
  selectedCardItemIds: 'securitySolution.onboarding.selectedCardItemIds',
  IntegrationSearchTerm: 'ONBOARDING_HUB.INTEGRATION_SEARCH_TERM',
  IntegrationScrollTop: 'ONBOARDING_HUB.INTEGRATION_SCROLL_TOP',
} as const;

/**
 * Wrapper hook for useLocalStorage, but always returns the default value when not defined instead of `undefined`.
 */
const useDefinedLocalStorage = <T>(key: string, defaultValue: T) => {
  const [value, setValue] = useLocalStorage<T>(key, defaultValue);
  return [value ?? defaultValue, setValue] as const;
};

/**
 * Stores the AVC banner dismissed state
 */
export const useStoredIsAVCBannerDismissed = () =>
  useDefinedLocalStorage<boolean>(LocalStorageKey.avcBannerDismissed, false);

/**
 * Stores the completed card IDs per space
 */
export const useStoredCompletedCardIds = (spaceId: string) =>
  useDefinedLocalStorage<OnboardingCardId[]>(`${LocalStorageKey.completeCards}.${spaceId}`, []);

/**
 * Stores the expanded card ID per space
 */
export const useStoredExpandedCardId = (spaceId: string) =>
  useDefinedLocalStorage<OnboardingCardId | null>(
    `${LocalStorageKey.expandedCard}.${spaceId}`,
    null
  );

interface SelectedCards {
  dashboardsCard: CardSelectorListItem['id'];
  alertsCard: CardSelectorListItem['id'];
  rulesCard: CardSelectorListItem['id'];
}

/**
 * Manages and updates selected card items in local storage for a specific space.
 */
export const useStoredSelectedCardItemIds = (spaceId: string) => {
  const storageKey = `${LocalStorageKey.selectedCardItemIds}.${spaceId}`;
  // Default selected cards fallback values
  const getDefaultSelectedCards = (): SelectedCards => ({
    dashboardsCard: DashboardsCardItemId.discover,
    alertsCard: AlertsCardItemId.list,
    rulesCard: RulesCardItemId.install,
  });

  const safeParseJSON = <T>(json: string | null, fallback: T): T => {
    try {
      return json ? JSON.parse(json) : fallback;
    } catch {
      return fallback;
    }
  };
  // Retrieves the current selected cards from localStorage
  const currentStoredCards = localStorage.getItem(storageKey);

  const currentSelectedCards = useMemo(
    () => safeParseJSON<SelectedCards>(currentStoredCards, getDefaultSelectedCards()),
    [currentStoredCards]
  );

  const [storedCards, setStoredCards] = useDefinedLocalStorage<SelectedCards>(
    storageKey,
    currentSelectedCards
  );

  const setStoredSelectedCardItemId = useCallback(
    (cardType: keyof SelectedCards, cardId: CardSelectorListItem['id']) => {
      const updatedCards = {
        ...currentSelectedCards,
        [cardType]: cardId,
      };
      // Avoids unnecessary updates if the value is the same
      if (JSON.stringify(storedCards) !== JSON.stringify(updatedCards)) {
        setStoredCards(updatedCards);
      }
    },
    [currentSelectedCards, setStoredCards, storedCards]
  );

  return {
    storedSelectedCardItemIds: storedCards,
    setStoredSelectedCardItemId,
  };
};

/**
 * Stores the selected integration tab ID per space
 */
export const useStoredIntegrationTabId = (
  spaceId: string,
  defaultSelectedTabId: IntegrationTabId
) =>
  useDefinedLocalStorage<IntegrationTabId>(
    `${LocalStorageKey.selectedIntegrationTabId}.${spaceId}`,
    defaultSelectedTabId
  );

/**
 * Stores the integration search term per space
 */
export const useStoredIntegrationSearchTerm = (spaceId: string) =>
  useDefinedLocalStorage<string | null>(
    `${LocalStorageKey.IntegrationSearchTerm}.${spaceId}`,
    null
  );
