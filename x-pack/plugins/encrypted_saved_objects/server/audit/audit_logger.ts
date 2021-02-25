/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, LegacyAuditLogger } from '../../../security/server';
import type { SavedObjectDescriptor } from '../crypto';
import { descriptorToArray } from '../crypto';

/**
 * Represents all audit events the plugin can log.
 */
export class EncryptedSavedObjectsAuditLogger {
  constructor(private readonly logger: LegacyAuditLogger = { log() {} }) {}

  public encryptAttributeFailure(
    attributeName: string,
    descriptor: SavedObjectDescriptor,
    user?: AuthenticatedUser
  ) {
    this.logger.log(
      'encrypt_failure',
      `Failed to encrypt attribute "${attributeName}" for saved object "[${descriptorToArray(
        descriptor
      )}]".`,
      { ...descriptor, attributeName, username: user?.username }
    );
  }

  public decryptAttributeFailure(
    attributeName: string,
    descriptor: SavedObjectDescriptor,
    user?: AuthenticatedUser
  ) {
    this.logger.log(
      'decrypt_failure',
      `Failed to decrypt attribute "${attributeName}" for saved object "[${descriptorToArray(
        descriptor
      )}]".`,
      { ...descriptor, attributeName, username: user?.username }
    );
  }

  public encryptAttributesSuccess(
    attributesNames: readonly string[],
    descriptor: SavedObjectDescriptor,
    user?: AuthenticatedUser
  ) {
    this.logger.log(
      'encrypt_success',
      `Successfully encrypted attributes "[${attributesNames}]" for saved object "[${descriptorToArray(
        descriptor
      )}]".`,
      { ...descriptor, attributesNames, username: user?.username }
    );
  }

  public decryptAttributesSuccess(
    attributesNames: readonly string[],
    descriptor: SavedObjectDescriptor,
    user?: AuthenticatedUser
  ) {
    this.logger.log(
      'decrypt_success',
      `Successfully decrypted attributes "[${attributesNames}]" for saved object "[${descriptorToArray(
        descriptor
      )}]".`,
      { ...descriptor, attributesNames, username: user?.username }
    );
  }
}
