/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFile } from 'fs/promises';

import { appContextService } from '../../app_context';

let cachedKey: string = '';

export async function getGpgKey(): Promise<string> {
  if (cachedKey) return cachedKey;

  const gpgKeyPath = appContextService.getConfig()?.packageVerification?.gpgKeyPath;

  if (!gpgKeyPath) {
    throw new Error('No path specified in "packageVerification.gpgKeyPath", unable to get GPG key');
  }

  const buffer = await readFile(gpgKeyPath);

  const key = buffer.toString();

  cachedKey = key;
  return key;
}
