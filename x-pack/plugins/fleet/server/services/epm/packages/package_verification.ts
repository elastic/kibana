/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFile } from 'fs/promises';

import * as openpgp from 'openpgp';
import type { Logger } from '@kbn/logging';

import type { PackageVerificationResult } from '../../../types';

import * as Registry from '../registry';

import { appContextService } from '../../app_context';
import type { Installation } from '../../../types';

interface VerificationResult {
  isVerified: boolean;
  keyId: string;
}

let cachedKey: openpgp.Key | undefined | null = null;

export async function getGpgKeyIdOrUndefined(): Promise<string | undefined> {
  const key = await getGpgKeyOrUndefined();

  if (!key) return undefined;

  return key.getKeyID().toHex();
}

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
  pkgArchiveBuffer,
  logger,
}: {
  pkgName: string;
  pkgVersion: string;
  pkgArchiveBuffer: Buffer;
  logger: Logger;
}): Promise<PackageVerificationResult> {
  const verificationKey = await getGpgKeyOrUndefined();
  const result: PackageVerificationResult = { verificationStatus: 'unknown' };
  if (!verificationKey) {
    logger.warn(`Not performing package verification as no local verification key found`);
    return result;
  }
  const pkgArchiveSignature = await Registry.getPackageArchiveSignatureOrUndefined({
    pkgName,
    pkgVersion,
    logger,
  });

  if (!pkgArchiveSignature) {
    logger.warn(
      `Package ${pkgName}-${pkgVersion} has no corresponding signature. Skipping verification.`
    );
    return result;
  }

  const { isVerified, keyId } = await _verifyPackageSignature({
    pkgArchiveBuffer,
    pkgArchiveSignature,
    verificationKey,
    logger,
  });

  return { verificationStatus: isVerified ? 'verified' : 'unverified', verificationKeyId: keyId };
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

type InstallationVerificationKeys = Pick<
  Installation,
  'verification_status' | 'verification_key_id'
>;

export function formatVerificationResultForSO(
  verificationResult: PackageVerificationResult
): InstallationVerificationKeys {
  const verification: InstallationVerificationKeys = {
    verification_status: verificationResult.verificationStatus,
  };

  if (verificationResult.verificationKeyId) {
    verification.verification_key_id = verificationResult.verificationKeyId;
  }

  return verification;
}
