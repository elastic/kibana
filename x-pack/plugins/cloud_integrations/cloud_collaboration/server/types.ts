/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CloudSetup, CloudStart } from '@kbn/cloud-plugin/server';
import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CloudCollaborationPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CloudCollaborationPluginStart {}

export interface CloudCollaborationPluginSetupDependencies {
  cloud: CloudSetup;
  security?: SecurityPluginSetup;
}

export interface CloudCollaborationPluginStartDependencies {
  cloud: CloudStart;
  security?: SecurityPluginStart;
}
