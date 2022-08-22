/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ComponentType, ReactElement, ReactNode } from 'react';
import { CoreStart } from '@kbn/core/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import {
  DataViewField,
  DataViewsPublicPluginStart,
  FieldSpec,
} from '@kbn/data-views-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { TriggersAndActionsUIPublicPluginStart as TriggersActionsStart } from '@kbn/triggers-actions-ui-plugin/public';
import { BrowserField } from '@kbn/triggers-actions-ui-plugin/public/application/sections/field_browser/types';
import { DataViewBase } from '@kbn/es-query';

export interface SecuritySolutionDataViewBase extends DataViewBase {
  fields: Array<FieldSpec & DataViewField>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ThreatIntelligencePluginSetup {}

export interface ThreatIntelligencePluginStart {
  getComponent: () => (props: {
    securitySolutionContext: SecuritySolutionPluginContext;
  }) => ReactElement;
}

export interface ThreatIntelligencePluginStartDeps {
  data: DataPublicPluginStart;
}

export type Services = {
  data: DataPublicPluginStart;
  storage: Storage;
  dataViews: DataViewsPublicPluginStart;
  triggersActionsUi: TriggersActionsStart;
} & CoreStart;

export interface LicenseAware {
  isEnterprise(): boolean;
}

export type BrowserFields = Readonly<Record<string, Partial<BrowserField>>>;

export interface SourcererDataView {
  indexPattern: SecuritySolutionDataViewBase;
  browserFields: BrowserFields;
  selectedPatterns: string[];
}

/**
 * Methods exposed from the security solution to the threat intelligence application.
 */
export interface SecuritySolutionPluginContext {
  /**
   * Gets the `FiltersGlobal` component for embedding a filter bar in the security solution application.
   * */
  getFiltersGlobalComponent: () => ComponentType<{ children: ReactNode }>;
  /**
   * Get the user's license to drive the Threat Intelligence plugin's visibility.
   */
  licenseService: LicenseAware;
  sourcererDataView: SourcererDataView;
}
