/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectDescriptor, descriptorToArray } from '../crypto';
import { LegacyAPI } from '../plugin';

/**
 * Represents all audit events the plugin can log.
 */
export class EncryptedSavedObjectsAuditLogger {
  constructor(private readonly getAuditLogger: () => LegacyAPI['auditLogger']) {}

  public encryptAttributeFailure(attributeName: string, descriptor: SavedObjectDescriptor) {
    this.getAuditLogger().log(
      'encrypt_failure',
      `Failed to encrypt attribute "${attributeName}" for saved object "[${descriptorToArray(
        descriptor
      )}]".`,
      { ...descriptor, attributeName }
    );
  }

  public decryptAttributeFailure(attributeName: string, descriptor: SavedObjectDescriptor) {
    this.getAuditLogger().log(
      'decrypt_failure',
      `Failed to decrypt attribute "${attributeName}" for saved object "[${descriptorToArray(
        descriptor
      )}]".`,
      { ...descriptor, attributeName }
    );
  }

  public encryptAttributesSuccess(
    attributesNames: readonly string[],
    descriptor: SavedObjectDescriptor
  ) {
    this.getAuditLogger().log(
      'encrypt_success',
      `Successfully encrypted attributes "[${attributesNames}]" for saved object "[${descriptorToArray(
        descriptor
      )}]".`,
      { ...descriptor, attributesNames }
    );
  }

  public decryptAttributesSuccess(
    attributesNames: readonly string[],
    descriptor: SavedObjectDescriptor
  ) {
    this.getAuditLogger().log(
      'decrypt_success',
      `Successfully decrypted attributes "[${attributesNames}]" for saved object "[${descriptorToArray(
        descriptor
      )}]".`,
      { ...descriptor, attributesNames }
    );
  }
}
