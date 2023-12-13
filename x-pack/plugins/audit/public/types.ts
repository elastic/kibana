/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { UiActionsSetup } from '@kbn/ui-actions-plugin/public';

export interface AuditPluginSetupDeps {
  uiActions: UiActionsSetup;
}

export interface AuditPluginStartDeps {
  data: DataPublicPluginStart;
}

export type AuditPluginSetup = void;
export type AuditPluginStart = void;
