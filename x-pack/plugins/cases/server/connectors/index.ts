/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginSetupContract as ActionsPluginSetupContract } from '@kbn/actions-plugin/server';
import { getCasesConnectorType } from './cases';

export * from './types';
export { casesConnectors } from './factory';

export function registerConnectorTypes({ actions }: { actions: ActionsPluginSetupContract }) {
  actions.registerSubActionConnectorType(getCasesConnectorType());
}
