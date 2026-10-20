/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializer } from '@kbn/core/server';

import type { ServiceAccountsTestPlugin } from './plugin';

export const plugin: PluginInitializer<
  void,
  void
> = async (): Promise<ServiceAccountsTestPlugin> => {
  const { ServiceAccountsTestPlugin: Implementation } = await import('./plugin');
  return new Implementation();
};
