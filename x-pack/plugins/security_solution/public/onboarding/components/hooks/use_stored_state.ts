/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useMemo } from 'react';
import { LocalStorageKey, type OnboardingCardId } from '../../constants';
import type { IntegrationTabId } from '../onboarding_body/cards/integrations/types';

/**
 * Wrapper hook for useLocalStorage, but always returns the default value when not defined instead of `undefined`.
 */
export const useDefinedLocalStorage = <T = undefined>(key: string, defaultValue: T) => {
  const [value, setValue] = useLocalStorage<T>(key, defaultValue);
  return useMemo(() => [value ?? defaultValue, setValue] as const, [value, defaultValue, setValue]);
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
 * Stores the selected topic ID per space
 */
export const useStoredUrlDetails = (spaceId: string) =>
  useDefinedLocalStorage<string | null>(`${LocalStorageKey.urlDetails}.${spaceId}`, null);

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
    `${LocalStorageKey.integrationSearchTerm}.${spaceId}`,
    null
  );

/**
 * Stores the siem migrations connector id
 */
export const useStoredSiemMigrationsConnectorId = (spaceId: string) =>
  useDefinedLocalStorage<string | undefined>(
    `${LocalStorageKey.siemMigrationsConnectorId}.${spaceId}`,
    undefined
  );
