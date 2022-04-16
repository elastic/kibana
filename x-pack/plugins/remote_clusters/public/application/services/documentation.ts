/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DocLinksStart } from '@kbn/core/public';

export let skippingDisconnectedClustersUrl: string;
export let remoteClustersUrl: string;
export let transportPortUrl: string;
export let proxyModeUrl: string;
export let proxySettingsUrl: string;

export function init({ links }: DocLinksStart): void {
  skippingDisconnectedClustersUrl = links.ccs.skippingDisconnectedClusters;
  remoteClustersUrl = links.elasticsearch.remoteClusters;
  transportPortUrl = links.elasticsearch.transportSettings;
  proxyModeUrl = links.elasticsearch.remoteClustersProxy;
  proxySettingsUrl = links.elasticsearch.remoteClusersProxySettings;
}
