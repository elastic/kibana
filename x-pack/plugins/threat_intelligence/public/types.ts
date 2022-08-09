/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ComponentType, ReactElement, ReactNode } from 'react';
import { CoreStart } from '@kbn/core/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ThreatIntelligencePluginSetup {}

export interface ThreatIntelligencePluginStart {
  getComponent: () => (props: {
    securitySolutionContext: ThreatIntelligenceSecuritySolutionContext;
  }) => ReactElement;
}

export interface ThreatIntelligencePluginStartDeps {
  data: DataPublicPluginStart;
}

export type Services = {
  data: DataPublicPluginStart;
  storage: Storage;
  dataViews: DataViewsPublicPluginStart;
} & CoreStart;

export interface LicenseAware {
  isEnterprise(): boolean;
}

export interface ThreatIntelligenceSecuritySolutionContext {
  getFiltersGlobalComponent: () => ComponentType<{ children: ReactNode }>;
  licenseService: LicenseAware;
}
