/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFile } from 'fs/promises';

import type { FleetConfigType } from '../../../../common/types';

let cachedKey: string = '';

export async function getGpgKey(config: FleetConfigType['packageVerification']): Promise<string> {
  if (cachedKey) return cachedKey;

  const gpgKeyPath = config?.gpgKeyPath;

  if (!gpgKeyPath) {
    throw new Error('No gpg key path specified, unable to get GPG key');
  }

  const buffer = await readFile(gpgKeyPath);

  const key = buffer.toString();

  cachedKey = key;
  return key;
}
