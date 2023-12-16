/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Plugin } from '@kbn/core/public';
import { CoreSetup } from '@kbn/core/public';
import { getAuditDiff } from './get_audit_diff';
import {
  AuditPluginSetup,
  AuditPluginSetupDeps,
  AuditPluginStart,
  AuditPluginStartDeps,
} from './types';

export type AuditCoreSetup = CoreSetup<AuditPluginStartDeps, AuditPluginStart>;

export class AuditPlugin
  implements Plugin<AuditPluginSetup, AuditPluginStart, AuditPluginSetupDeps, AuditPluginStartDeps>
{
  public setup(core: AuditCoreSetup, deps: AuditPluginSetupDeps): AuditPluginSetup {}

  public start(core: CoreStart, plugins: AuditPluginStartDeps): AuditPluginStart {
    return {
      getAuditDiff,
    };
  }

  public stop() {}
}
