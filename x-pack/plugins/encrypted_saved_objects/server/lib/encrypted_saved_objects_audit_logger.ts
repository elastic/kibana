/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectDescriptor, descriptorToArray } from './encrypted_saved_objects_service';

/**
 * Represents all audit events the plugin can log.
 */
export class EncryptedSavedObjectsAuditLogger {
  constructor(private readonly auditLogger: any) {}

  public encryptAttributeFailure(attributeName: string, descriptor: SavedObjectDescriptor) {
    this.auditLogger.log(
      'encrypt_failure',
      `Failed to encrypt attribute "${attributeName}" for saved object "[${descriptorToArray(
        descriptor
      )}]".`,
      { ...descriptor, attributeName }
    );
  }

  public decryptAttributeFailure(attributeName: string, descriptor: SavedObjectDescriptor) {
    this.auditLogger.log(
      'decrypt_failure',
      `Failed to decrypt attribute "${attributeName}" for saved object "[${descriptorToArray(
        descriptor
      )}]".`,
      { ...descriptor, attributeName }
    );
  }

  public encryptAttributesSuccess(
    attributesNames: ReadonlyArray<string>,
    descriptor: SavedObjectDescriptor
  ) {
    this.auditLogger.log(
      'encrypt_success',
      `Successfully encrypted attributes "[${attributesNames}]" for saved object "[${descriptorToArray(
        descriptor
      )}]".`,
      { ...descriptor, attributesNames }
    );
  }

  public decryptAttributesSuccess(
    attributesNames: ReadonlyArray<string>,
    descriptor: SavedObjectDescriptor
  ) {
    this.auditLogger.log(
      'decrypt_success',
      `Successfully decrypted attributes "[${attributesNames}]" for saved object "[${descriptorToArray(
        descriptor
      )}]".`,
      { ...descriptor, attributesNames }
    );
  }
}
