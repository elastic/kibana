/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimeRange } from '@kbn/es-query';
import { Search } from 'history';
import type { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import type { InfraWaffleMapOptions } from '../../common/inventory/types';

export type { AssetDetailsUrlState } from './hooks/use_asset_details_url_state';

export interface Asset {
  id: string;
  name?: string;
}

export enum ContentTabIds {
  OVERVIEW = 'overview',
  METADATA = 'metadata',
  METRICS = 'metrics',
  PROCESSES = 'processes',
  PROFILING = 'profiling',
  ANOMALIES = 'anomalies',
  OSQUERY = 'osquery',
  LOGS = 'logs',
  DASHBOARDS = 'dashboards',
}

export type TabIds = `${ContentTabIds}`;

export interface OverridableTabState {
  metadata?: {
    showActionsColumn?: boolean;
  };
  alertRule?: {
    options?: Partial<Pick<InfraWaffleMapOptions, 'groupBy' | 'metric'>>;
  };
}

export interface TabState extends OverridableTabState {
  activeTabId?: TabIds;
  dateRange?: TimeRange;
}
export interface FlyoutProps {
  closeFlyout: () => void;
  mode: 'flyout';
}

export interface FullPageProps {
  mode: 'page';
}

export type RenderMode = FlyoutProps | FullPageProps;

export interface Tab {
  id: ContentTabIds;
  name: string;
  append?: JSX.Element;
}

export type LinkOptions = 'alertRule' | 'nodeDetails';

export interface AssetDetailsProps {
  assetId: string;
  assetName?: string;
  assetType: InventoryItemType;
  autoRefresh?: {
    isPaused?: boolean;
    interval?: number;
  };
  dateRange?: TimeRange;
  tabs: Tab[];
  overrides?: OverridableTabState;
  renderMode: RenderMode;
  links?: LinkOptions[];
}

export type TabsStateChangeFn = (state: TabState) => void;

export type ContentTemplateProps = Pick<AssetDetailsProps, 'tabs' | 'links'>;

export interface RouteState {
  originAppId: string;
  originPathname: string;
  originSearch?: Search;
}

export type DataViewOrigin = 'logs' | 'metrics';

export enum IntegrationEventModules {
  kubernetesNode = 'kubernetesNode',
  kubernetesContainer = 'kubernetesContainer',
  docker = 'docker',
}
