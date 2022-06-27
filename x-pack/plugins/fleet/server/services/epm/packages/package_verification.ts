/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFile } from 'fs/promises';

import * as openpgp from 'openpgp';
import type { Logger } from '@kbn/logging';

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

export interface PackageVerificationResult {
  verified: boolean;
  keyId: string;
}

export async function verifyPackageSignature({
  pkgZipBuffer,
  pkgZipSignature,
  verificationKey,
  logger,
}: {
  pkgZipBuffer: Buffer;
  pkgZipSignature: string;
  verificationKey: openpgp.Key;
  logger: Logger;
}): Promise<PackageVerificationResult> {
  const signature = await openpgp.readSignature({
    armoredSignature: pkgZipSignature,
  });

  const message = await openpgp.createMessage({
    binary: pkgZipBuffer,
  });

  const verificationResult = await openpgp.verify({
    verificationKeys: verificationKey,
    signature,
    message,
  });

  const signatureVerificationResult = verificationResult.signatures[0];

  let verified = false;
  try {
    verified = await signatureVerificationResult.verified;
  } catch (e) {
    logger.error(`Error verifying package signature: ${e}`);
  }
  return { verified, keyId: verificationKey.getKeyID().toHex() };
}
