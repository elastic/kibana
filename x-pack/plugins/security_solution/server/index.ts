/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext, PluginConfigDescriptor } from '../../../../src/core/server';
import { Plugin, PluginSetup, PluginStart } from './plugin';
import { configSchema, ConfigType } from './config';
import { SIGNALS_INDEX_KEY } from '../common/constants';

export const plugin = (context: PluginInitializerContext) => {
  return new Plugin(context);
};

export const config: PluginConfigDescriptor<ConfigType> = {
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

// Exports to be shared with plugins such as x-pack/lists plugin
export { deleteTemplate } from './lib/detection_engine/index/delete_template';
export { deletePolicy } from './lib/detection_engine/index/delete_policy';
export { deleteAllIndex } from './lib/detection_engine/index/delete_all_index';
export { setPolicy } from './lib/detection_engine/index/set_policy';
export { setTemplate } from './lib/detection_engine/index/set_template';
export { getTemplateExists } from './lib/detection_engine/index/get_template_exists';
export { getPolicyExists } from './lib/detection_engine/index/get_policy_exists';
export { createBootstrapIndex } from './lib/detection_engine/index/create_bootstrap_index';
export { getIndexExists } from './lib/detection_engine/index/get_index_exists';
export { buildRouteValidation } from './utils/build_validation/route_validation';
export { transformError, buildSiemResponse } from './lib/detection_engine/routes/utils';
export { readPrivileges } from './lib/detection_engine/privileges/read_privileges';
