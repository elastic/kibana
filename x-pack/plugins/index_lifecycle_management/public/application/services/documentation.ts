/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export let skippingDisconnectedClustersUrl: string;
export let remoteClustersUrl: string;
export let transportPortUrl: string;

let _esDocBasePath: string;

export function init(esDocBasePath: string): void {
  _esDocBasePath = esDocBasePath;
}

export const createDocLink = (docPath: string): string => `${_esDocBasePath}${docPath}`;
