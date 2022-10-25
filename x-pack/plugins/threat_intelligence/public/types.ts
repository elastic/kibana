/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ComponentType, ReactElement, ReactNode, VFC } from 'react';
import { CoreStart } from '@kbn/core/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import {
  DataViewField,
  DataViewsPublicPluginStart,
  FieldSpec,
} from '@kbn/data-views-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { TimelinesUIStart } from '@kbn/timelines-plugin/public';
import type { TriggersAndActionsUIPublicPluginStart as TriggersActionsStart } from '@kbn/triggers-actions-ui-plugin/public';
import { DataViewBase, Filter, Query, TimeRange } from '@kbn/es-query';
import { BrowserField } from '@kbn/rule-registry-plugin/common';
import { Store } from 'redux';
import { DataProvider } from '@kbn/timelines-plugin/common';
import { Start as InspectorPluginStart } from '@kbn/inspector-plugin/public';

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
  timelines: TimelinesUIStart;
  securityLayout: any;
  inspector: InspectorPluginStart;
} & CoreStart;

export interface LicenseAware {
  isEnterprise(): boolean;
}

export type BrowserFields = Readonly<Record<string, Partial<BrowserField>>>;

export interface SourcererDataView {
  indexPattern: SecuritySolutionDataViewBase;
  browserFields: BrowserFields;
  selectedPatterns: string[];
  loading: boolean;
}

export interface UseInvestigateInTimelineProps {
  dataProviders: DataProvider[];
  from: string;
  to: string;
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
   * Gets the `PageWrapper` component for embedding a filter bar in the security solution application.
   * */
  getPageWrapper: () => ComponentType<{ children: ReactNode }>;

  /**
   * Get the user's license to drive the Threat Intelligence plugin's visibility.
   */
  licenseService: LicenseAware;
  /**
   * Gets Security Solution shared information like browerFields, indexPattern and selectedPatterns in DataView.
   */
  sourcererDataView: SourcererDataView;
  /**
   * Security Solution store
   */
  getSecuritySolutionStore: Store;
  /**
   * Pass UseInvestigateInTimeline functionality to TI plugin
   */
  getUseInvestigateInTimeline: ({
    dataProviders,
    from,
    to,
  }: UseInvestigateInTimelineProps) => () => Promise<void>;

  useQuery: () => Query;
  useFilters: () => Filter[];
  useGlobalTime: () => TimeRange;

  SiemSearchBar: VFC<any>;
}
