/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TODO:
 * IMPORTANT: Please see how {@link BreadcrumbService} is set up for an example of how these services should be set up
 * in future. The pattern in this file is legacy and should be updated to conform to the plugin lifecycle.
 */

export let skippingDisconnectedClustersUrl: string;
export let remoteClustersUrl: string;
export let transportPortUrl: string;

let _esDocBasePath: string;

export function init(esDocBasePath: string): void {
  _esDocBasePath = esDocBasePath;
}

export const createDocLink = (docPath: string): string => `${_esDocBasePath}${docPath}`;
export const getNodeAllocationMigrationLink = () =>
  `${_esDocBasePath}migrate-index-allocation-filters.html`;
