/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ComponentType, NamedExoticComponent, ReactElement, ReactNode, VFC } from 'react';
import { CoreStart } from '@kbn/core/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import {
  DataViewField,
  type DataViewSpec,
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
import { CasesPublicSetup, CasesPublicStart } from '@kbn/cases-plugin/public/types';
import { CreateExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { Policy } from './modules/block_list/hooks/use_policies';

export interface SecuritySolutionDataViewBase extends DataViewBase {
  fields: Array<FieldSpec & DataViewField>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ThreatIntelligencePluginSetup {}

export interface SetupPlugins {
  cases: CasesPublicSetup;
}

export interface ThreatIntelligencePluginStart {
  getComponent: () => (props: {
    securitySolutionContext: SecuritySolutionPluginContext;
  }) => ReactElement;
}

export interface ThreatIntelligencePluginStartDeps {
  data: DataPublicPluginStart;
}

export type Services = {
  cases: CasesPublicStart;
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
  isPlatinumPlus(): boolean;
}

export type BrowserFields = Readonly<Record<string, Partial<BrowserField>>>;

export interface SelectedDataView {
  sourcererDataView: DataViewSpec | undefined;
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

export interface BlockListFlyoutProps {
  apiClient: unknown;
  item: CreateExceptionListItemSchema;
  policies: Policy[];
  policiesIsLoading: boolean;
  FormComponent: NamedExoticComponent<BlockListFormProps>;
  onClose: () => void;
}

export interface BlockListFormProps {
  item: CreateExceptionListItemSchema;
}

export interface Blocking {
  canWriteBlocklist: boolean;
  exceptionListApiClient: unknown;
  useSetUrlParams: () => (
    params: Record<string, string | number | null | undefined>,
    replace?: boolean | undefined
  ) => void;
  getFlyoutComponent: () => NamedExoticComponent<BlockListFlyoutProps>;
  getFormComponent: () => NamedExoticComponent<BlockListFormProps>;
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
  sourcererDataView: SelectedDataView;

  /**
   * Security Solution store
   */
  securitySolutionStore: Store;

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

  /**
   * Register query in security solution store for tracking and centralized refresh support
   */
  registerQuery: (query: { id: string; loading: boolean; refetch: VoidFunction }) => void;

  /**
   * Deregister stale query
   */
  deregisterQuery: (query: { id: string }) => void;

  /**
   * Add to blocklist feature
   */
  blockList: Blocking;
}

/**
 * All the names for the threat intelligence pages.
 *
 * Example to add more names:
 *   export type TIPage = 'indicators' | 'feed';
 */
export type TIPage = 'indicators';

/**
 * All the IDs for the threat intelligence pages.
 * This needs to match the threat intelligence page entries in SecurityPageName` (x-pack/plugins/security_solution/common/constants.ts).
 *
 * Example to add more IDs:
 *   export type TIPageId = 'threat_intelligence' | 'threat_intelligence-feed';
 */
export type TIPageId = 'threat_intelligence';

/**
 * A record of all the properties that will be used to build deeplinks, links and navtabs objects.
 */
export interface TIPageProperties {
  id: TIPageId;
  readonly oldNavigationName: string; // delete when the old navigation is removed
  readonly newNavigationName: string; // rename to name when the old navigation is removed
  readonly path: string;
  readonly disabled: boolean;
  readonly description: string;
  readonly globalSearchKeywords: string[];
  readonly keywords: string[];
}
