/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, PluginConfigDescriptor } from '@kbn/core/server';
import { Plugin, PluginSetup, PluginStart } from './plugin';
import { configSchema, ConfigSchema, ConfigType } from './config';
import { SIGNALS_INDEX_KEY } from '../common/constants';
import { AppClient } from './types';

export const plugin = (context: PluginInitializerContext) => {
  return new Plugin(context);
};

export const config: PluginConfigDescriptor<ConfigSchema> = {
  exposeToBrowser: {
    enableExperimental: true,
  },
  schema: configSchema,
  deprecations: ({ renameFromRoot, unused }) => [
    renameFromRoot('xpack.siem.enabled', 'xpack.securitySolution.enabled', { level: 'critical' }),
    renameFromRoot(
      'xpack.siem.maxRuleImportExportSize',
      'xpack.securitySolution.maxRuleImportExportSize',
      { level: 'critical' }
    ),
    renameFromRoot(
      'xpack.siem.maxRuleImportPayloadBytes',
      'xpack.securitySolution.maxRuleImportPayloadBytes',
      { level: 'critical' }
    ),
    renameFromRoot(
      'xpack.siem.maxTimelineImportExportSize',
      'xpack.securitySolution.maxTimelineImportExportSize',
      { level: 'critical' }
    ),
    renameFromRoot(
      'xpack.siem.maxTimelineImportPayloadBytes',
      'xpack.securitySolution.maxTimelineImportPayloadBytes',
      { level: 'critical' }
    ),
    renameFromRoot(
      `xpack.siem.${SIGNALS_INDEX_KEY}`,
      `xpack.securitySolution.${SIGNALS_INDEX_KEY}`,
      { level: 'critical' }
    ),
    unused('ruleExecutionLog.underlyingClient', { level: 'warning' }),
  ],
};

export type { ConfigType, PluginSetup, PluginStart };
export { Plugin };
export { AppClient };
export type { SecuritySolutionApiRequestHandlerContext } from './types';
