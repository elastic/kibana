/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AuditLogger } from '../../../security/server';
import { SavedObjectDescriptor, descriptorToArray } from '../crypto';
import { AuthenticatedUser } from '../../../security/common/model';

/**
 * Represents all audit events the plugin can log.
 */
export class EncryptedSavedObjectsAuditLogger {
  constructor(private readonly auditLogger?: AuditLogger) {}

  public encryptAttributeFailure(
    attributeName: string,
    descriptor: SavedObjectDescriptor,
    user?: AuthenticatedUser
  ) {
    if (!this.auditLogger) {
      return;
    }
    this.auditLogger.log(
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
    if (!this.auditLogger) {
      return;
    }
    this.auditLogger.log(
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
    if (!this.auditLogger) {
      return;
    }
    this.auditLogger.log(
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
    if (!this.auditLogger) {
      return;
    }
    this.auditLogger.log(
      'decrypt_success',
      `Successfully decrypted attributes "[${attributesNames}]" for saved object "[${descriptorToArray(
        descriptor
      )}]".`,
      { ...descriptor, attributesNames, username: user?.username }
    );
  }
}
