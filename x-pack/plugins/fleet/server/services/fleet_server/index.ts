/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { first } from 'rxjs/operators';
import { appContextService } from '../app_context';
import { licenseService } from '../license';
import { setupFleetServerIndexes } from './elastic_index';
import { runFleetServerMigration } from './saved_object_migrations';

let _isFleetServerSetup = false;
let _isPending = false;
let _status: Promise<any> | undefined;
let _onResolve: (arg?: any) => void;

export function isFleetServerSetup() {
  return _isFleetServerSetup;
}

export function awaitIfFleetServerSetupPending() {
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
    logger?.warn('Fleet need the security plugin to be enabled.');
    return;
  }

  try {
    // We need licence to be initialized before using the SO service.
    await licenseService.getLicenseInformation$()?.pipe(first())?.toPromise();
    await setupFleetServerIndexes();
    await runFleetServerMigration();
    _isFleetServerSetup = true;
  } catch (err) {
    logger?.error('Setup for central management for agent failed.');
    logger?.error(err);
  }
  _isPending = false;
  if (_onResolve) {
    _onResolve();
  }
}
