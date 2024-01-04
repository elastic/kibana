/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assetDetails } from './asset_details';
import { assetDetailsFlyout } from './asset_details_flyout';
import { hostsView } from './hosts_view';
import { kpi } from './kpi';
import { assetDetailsKubernetesNode } from './asset_details_kubernetes_node';

export const dashboards = {
  assetDetails,
  assetDetailsFlyout,
  hostsView,
  kpi,
  assetDetailsKubernetesNode,
};

export type HostDashboards = typeof dashboards;
