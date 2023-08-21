/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import type { LogViewReference } from '@kbn/logs-shared-plugin/common';
import { TimeRange } from '@kbn/es-query';
import type { InventoryItemType } from '../../../common/inventory_models/types';

interface Metadata {
  ip?: string | null;
}
export type Asset = Metadata & {
  id: string;
  name: string;
};

export enum FlyoutTabIds {
  OVERVIEW = 'overview',
  METADATA = 'metadata',
  PROCESSES = 'processes',
  ANOMALIES = 'anomalies',
  OSQUERY = 'osquery',
  LOGS = 'logs',
  LINK_TO_APM = 'linkToApm',
  LINK_TO_UPTIME = 'linkToUptime',
}

export type TabIds = `${FlyoutTabIds}`;

export interface TabState {
  overview?: {
    metricsDataView?: DataView;
    logsDataView?: DataView;
  };
  metadata?: {
    query?: string;
    showActionsColumn?: boolean;
  };
  processes?: {
    query?: string;
  };
  anomalies?: {
    onClose?: () => void;
  };
  alertRule?: {
    onCreateRuleClick?: () => void;
  };
  logs?: {
    query?: string;
    logView?: {
      reference?: LogViewReference | null;
      loading?: boolean;
    };
  };
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
  id: FlyoutTabIds;
  name: string;
}

export type LinkOptions = 'alertRule' | 'nodeDetails' | 'apmServices';

export interface AssetDetailsProps {
  asset: Asset;
  assetType: InventoryItemType;
  dateRange: TimeRange;
  tabs: Tab[];
  activeTabId?: TabIds;
  overrides?: TabState;
  renderMode?: RenderMode;
  onTabsStateChange?: TabsStateChangeFn;
  links?: LinkOptions[];
}

export type TabsStateChangeFn = (state: TabState & { activeTabId?: TabIds }) => void;
