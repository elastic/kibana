/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializerContext, PluginConfigDescriptor } from '../../../../src/core/server';
import { Plugin, PluginSetup, PluginStart } from './plugin';
import { configSchema, ConfigType } from './config';
import { SIGNALS_INDEX_KEY } from '../common/constants';
import { AppClient } from './types';

export const plugin = (context: PluginInitializerContext) => {
  return new Plugin(context);
};

export const config: PluginConfigDescriptor<ConfigType> = {
  exposeToBrowser: {
    enableExperimental: true,
  },
  schema: configSchema,
  deprecations: ({ renameFromRoot }) => [
    renameFromRoot('xpack.siem.enabled', 'xpack.securitySolution.enabled'),
    renameFromRoot(
      'xpack.siem.maxRuleImportExportSize',
      'xpack.securitySolution.maxRuleImportExportSize'
    ),
    renameFromRoot(
      'xpack.siem.maxRuleImportPayloadBytes',
      'xpack.securitySolution.maxRuleImportPayloadBytes'
    ),
    renameFromRoot(
      'xpack.siem.maxTimelineImportExportSize',
      'xpack.securitySolution.maxTimelineImportExportSize'
    ),
    renameFromRoot(
      'xpack.siem.maxTimelineImportPayloadBytes',
      'xpack.securitySolution.maxTimelineImportPayloadBytes'
    ),
    renameFromRoot(
      `xpack.siem.${SIGNALS_INDEX_KEY}`,
      `xpack.securitySolution.${SIGNALS_INDEX_KEY}`
    ),
  ],
};

export { ConfigType, Plugin, PluginSetup, PluginStart };
export { AppClient };
export type { AppRequestContext } from './types';
export { EndpointError } from './endpoint/errors';
