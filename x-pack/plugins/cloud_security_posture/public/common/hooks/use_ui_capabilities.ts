/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useKibana } from './use_kibana';

export const useCspUiCapabilities = () => {
  const uiCapabilities = useKibana().services.application?.capabilities;

  // CSP plugin is using the "Security" (siem) privilege
  const canUpdate = uiCapabilities.siem.crud as boolean;
  const canView = uiCapabilities.siem.show as boolean;

  return { canUpdate, canView };
};

export type CspUiCapabilities = ReturnType<typeof useCspUiCapabilities>;
