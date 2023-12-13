/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginSetup, PluginStart } from '@kbn/data-plugin/server';
import { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import { CustomRequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import { AuditService } from './service';
import { AuditClient } from './client';

export interface AuditPluginSetupDeps {
  data: PluginSetup;
  security: SecurityPluginSetup;
}

export interface AuditPluginStartDeps {
  data: PluginStart;
  security: SecurityPluginStart;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AuditPluginSetup {}

export interface AuditPluginStart {
  createAuditService: (namespace: string) => AuditService;
}

export type AuditRequestHandlerContext = CustomRequestHandlerContext<{
  audit: {
    getAuditClient: () => AuditClient;
  };
}>;
