/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DocLinksStart } from 'kibana/public';

export let skippingDisconnectedClustersUrl: string;
export let remoteClustersUrl: string;
export let transportPortUrl: string;

export function init(docLinks: DocLinksStart): void {
  const { DOC_LINK_VERSION, ELASTIC_WEBSITE_URL } = docLinks;
  const esDocBasePath = `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}`;

  skippingDisconnectedClustersUrl = `${esDocBasePath}/modules-cross-cluster-search.html#_skipping_disconnected_clusters`;
  remoteClustersUrl = `${esDocBasePath}/modules-remote-clusters.html`;
  transportPortUrl = `${esDocBasePath}/modules-transport.html`;
}
