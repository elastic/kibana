/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from 'kibana/server';
import { first } from 'rxjs/operators';

import { appContextService } from '../app_context';
import { licenseService } from '../license';
import { FLEET_SERVER_SERVERS_INDEX } from '../../constants';

import { runFleetServerMigration } from './saved_object_migrations';

let _isFleetServerSetup = false;
let _isPending = false;
let _status: Promise<any> | undefined;
let _onResolve: (arg?: any) => void;

export function isFleetServerSetup() {
  return _isFleetServerSetup;
}

/**
 * Check if at least one fleet server is connected
 */
export async function hasFleetServers(esClient: ElasticsearchClient) {
  const res = await esClient.search<{}, {}>({
    index: FLEET_SERVER_SERVERS_INDEX,
    ignore_unavailable: true,
  });

  // @ts-expect-error value is number | TotalHits
  return res.body.hits.total.value > 0;
}

export async function awaitIfFleetServerSetupPending() {
  if (!_isPending) {
    return;
  }

  return _status;
}

export async function startFleetServerSetup() {
  _isPending = true;
  _status = new Promise((resolve) => {
    _onResolve = resolve;
  });
  const logger = appContextService.getLogger();
  if (!appContextService.hasSecurity()) {
    // Fleet will not work if security is not enabled
    logger?.warn('Fleet requires the security plugin to be enabled.');
    return;
  }

  try {
    // We need licence to be initialized before using the SO service.
    await licenseService.getLicenseInformation$()?.pipe(first())?.toPromise();
    await runFleetServerMigration();
    _isFleetServerSetup = true;
  } catch (err) {
    logger?.error('Setup for central management of agents failed.');
    logger?.error(err);
  }
  _isPending = false;
  if (_onResolve) {
    _onResolve();
  }
}
