/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InfraAssetMetricType } from '../../../common/http_api';

export type CloudProvider = 'gcp' | 'aws' | 'azure' | 'unknownProvider';
type HostMetrics = Record<InfraAssetMetricType, number | null>;

interface HostMetadata {
  os?: string | null;
  ip?: string | null;
  servicesOnHost?: number | null;
  title: { name: string; cloudProvider?: CloudProvider | null };
  id: string;
}
export type HostNodeRow = HostMetadata &
  HostMetrics & {
    name: string;
  };

export enum FlyoutTabIds {
  METADATA = 'metadata',
  PROCESSES = 'processes',
}

export type TabIds = `${FlyoutTabIds}`;

export interface TabState {
  metadataTab?: {
    query?: string;
    showActionsColumn?: boolean;
  };
  processTab?: {
    query?: string;
  };
}

export type TabsStateChangeFn = (state: TabState & { activeTabId?: TabIds }) => void;
