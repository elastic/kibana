/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFile } from 'fs/promises';

import * as openpgp from 'openpgp';
import type { Logger } from '@kbn/logging';

import * as Registry from '../registry';

import { appContextService } from '../../app_context';

interface VerificationResult {
  isVerified: boolean;
  keyId: string;
}

export type PackageVerificationResult =
  | { verificationAttempted: false }
  | ({ verificationAttempted: true } & VerificationResult);

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

export async function verifyPackageArchiveSignature({
  pkgName,
  pkgVersion,
  logger,
}: {
  pkgName: string;
  pkgVersion: string;
  logger: Logger;
}): Promise<PackageVerificationResult> {
  const verificationKey = await getGpgKeyOrUndefined();

  if (!verificationKey) {
    logger.warn(`Not performing package verification as no local verification key found`);
    return { verificationAttempted: false };
  }
  const pkgArchiveSignature = await Registry.getPackageArchiveSignatureOrUndefined({
    pkgName,
    pkgVersion,
    logger,
  });

  if (!pkgArchiveSignature) {
    logger.warn(`Not performing package verification as package has no signature file`);
    return { verificationAttempted: false };
  }

  const { archiveBuffer: pkgArchiveBuffer } = await Registry.fetchArchiveBuffer(
    pkgName,
    pkgVersion
  );

  const verificationResult = await _verifyPackageSignature({
    pkgArchiveBuffer,
    pkgArchiveSignature,
    verificationKey,
    logger,
  });

  return { verificationAttempted: true, ...verificationResult };
}

async function _verifyPackageSignature({
  pkgArchiveBuffer,
  pkgArchiveSignature,
  verificationKey,
  logger,
}: {
  pkgArchiveBuffer: Buffer;
  pkgArchiveSignature: string;
  verificationKey: openpgp.Key;
  logger: Logger;
}): Promise<VerificationResult> {
  const signature = await openpgp.readSignature({
    armoredSignature: pkgArchiveSignature,
  });

  const message = await openpgp.createMessage({
    binary: pkgArchiveBuffer,
  });

  const verificationResult = await openpgp.verify({
    verificationKeys: verificationKey,
    signature,
    message,
  });

  const signatureVerificationResult = verificationResult.signatures[0];

  let isVerified = false;
  try {
    isVerified = await signatureVerificationResult.verified;
  } catch (e) {
    logger.error(`Error verifying package signature: ${e}`);
  }
  return { isVerified, keyId: verificationKey.getKeyID().toHex() };
}
