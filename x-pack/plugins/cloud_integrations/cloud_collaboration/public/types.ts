/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/public';
import { BehaviorSubject } from 'rxjs';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CloudCollaborationPluginSetup {}

export interface CloudCollaborationPluginStart {
  clearBreadcrumbPresence: () => void;
  clearPageTitle: () => void;
  getIsAvailable$: () => BehaviorSubject<boolean>;
  getToken$: () => BehaviorSubject<string | null>;
  setBreadcrumbPresence: (application: string, savedObjectId: string) => void;
  setPageTitle: (title: string | null) => void;
}

export interface CloudCollaborationPluginSetupDependencies {
  cloud: CloudSetup;
  security?: SecurityPluginSetup;
}

export interface CloudCollaborationPluginStartDependencies {
  cloud: CloudStart;
  security?: SecurityPluginStart;
}
