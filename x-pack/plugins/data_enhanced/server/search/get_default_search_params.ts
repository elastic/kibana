/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IUiSettingsClient } from 'src/core/server';
import { UI_SETTINGS } from '../../../../../src/plugins/data/common';

import { getDefaultSearchParams as getBaseSearchParams } from '../../../../../src/plugins/data/server';

/**
 @internal
 */
export async function getDefaultSearchParams(uiSettingsClient: IUiSettingsClient) {
  const ignoreThrottled = !(await uiSettingsClient.get(UI_SETTINGS.SEARCH_INCLUDE_FROZEN));

  return {
    ignoreThrottled,
    ...(await getBaseSearchParams(uiSettingsClient)),
  };
}

/**
 @internal
 */
export const getAsyncOptions = (): {
  waitForCompletionTimeout: string;
  keepAlive: string;
} => ({
  waitForCompletionTimeout: '100ms', // Wait up to 100ms for the response to return
  keepAlive: '1m', // Extend the TTL for this search request by one minute,
});
