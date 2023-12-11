/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ASSET_MANAGER_API_BASE = '/api/asset-manager';

function base(path: string) {
  return `${ASSET_MANAGER_API_BASE}${path}`;
}

export const GET_ASSETS = base('/assets');
export const GET_RELATED_ASSETS = base('/assets/related');
export const GET_ASSETS_DIFF = base('/assets/diff');

export const GET_HOSTS = base('/assets/hosts');
export const GET_SERVICES = base('/assets/services');
export const GET_CONTAINERS = base('/assets/containers');
export const GET_PODS = base('/assets/pods');
