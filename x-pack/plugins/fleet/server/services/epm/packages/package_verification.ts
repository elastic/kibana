/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFile } from 'fs/promises';

import * as openpgp from 'openpgp';

import { appContextService } from '../../app_context';
let cachedKey: openpgp.Key | undefined | null = null;

export async function getGpgKeyOrUndefined(): Promise<openpgp.Key | undefined> {
  if (cachedKey !== null) return cachedKey;

  cachedKey = await _readGpgKey();
  return cachedKey;
}

export async function _readGpgKey(): Promise<openpgp.Key | undefined> {
  const config = appContextService.getConfig();
  const logger = appContextService.getLogger();
  const gpgKeyPath = config?.packageVerification?.gpgKeyPath;
  if (!gpgKeyPath) {
    logger.warn('GPG key path not configured at "xpack.fleet.packageVerification.gpgKeyPath"');
    return undefined;
  }

  let buffer: Buffer;
  try {
    buffer = await readFile(gpgKeyPath);
  } catch (e) {
    logger.warn(`Unable to retrieve GPG key from '${gpgKeyPath}': ${e.code}`);
    return undefined;
  }
  let key;
  try {
    key = await openpgp.readKey({ armoredKey: buffer.toString() });
  } catch (e) {
    logger.warn(`Unable to parse GPG key from '${gpgKeyPath}': ${e}`);
  }

  return key;
}
