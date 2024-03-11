/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreRequestHandlerContext } from '@kbn/core-http-request-handler-context-server';

export const assertAdvancedSettingsEnabled = async (
  core: CoreRequestHandlerContext,
  settingId: string
) => {
  const isAdvancedSettingsEnabled = await core.uiSettings.client.get<boolean>(settingId);

  if (!isAdvancedSettingsEnabled) {
    throw new Error(`Advanced Settings ${settingId} is disabled.`);
  }
};
