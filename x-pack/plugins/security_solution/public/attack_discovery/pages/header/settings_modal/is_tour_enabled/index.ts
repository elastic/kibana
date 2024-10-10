/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getIsTourEnabled = ({
  connectorId,
  isLoading,
  localStorageAttackDiscoveryMaxAlerts,
  setLocalStorageAttackDiscoveryMaxAlerts,
  tourDelayElapsed,
  showSettingsTour,
}: {
  connectorId: string | undefined;
  isLoading: boolean;
  localStorageAttackDiscoveryMaxAlerts: string | undefined;
  tourDelayElapsed: boolean;
  setLocalStorageAttackDiscoveryMaxAlerts: React.Dispatch<React.SetStateAction<string | undefined>>;
  showSettingsTour: boolean | undefined;
}): boolean => !isLoading && connectorId != null && tourDelayElapsed && !!showSettingsTour;
