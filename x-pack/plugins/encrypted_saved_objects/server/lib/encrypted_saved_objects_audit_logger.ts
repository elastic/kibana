/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Represents all audit events the plugin can log.
 */
export class EncryptedSavedObjectsAuditLogger {
  constructor(private readonly enabled: boolean, private readonly auditLogger: any) {}

  public encryptAttributeFailure(attributeName: string, type: string, id: string) {
    if (!this.enabled) {
      return;
    }

    this.auditLogger.log(
      'encrypt_failure',
      `Failed to encrypt attribute "${attributeName}" for saved object "${type}:${id}".`,
      { id, type, attributeName }
    );
  }

  public decryptAttributeFailure(attributeName: string, type: string, id: string) {
    if (!this.enabled) {
      return;
    }

    this.auditLogger.log(
      'decrypt_failure',
      `Failed to decrypt attribute "${attributeName}" for saved object "${type}:${id}".`,
      { id, type, attributeName }
    );
  }

  public encryptAttributesSuccess(attributesNames: ReadonlySet<string>, type: string, id: string) {
    if (!this.enabled) {
      return;
    }

    const attributesNamesArray = Array.from(attributesNames);
    this.auditLogger.log(
      'encrypt_success',
      `Successfully encrypted attributes "[${attributesNamesArray}]" for saved object "${type}:${id}".`,
      { id, type, attributesNames: attributesNamesArray }
    );
  }

  public decryptAttributesSuccess(attributesNames: ReadonlySet<string>, type: string, id: string) {
    if (!this.enabled) {
      return;
    }

    const attributesNamesArray = Array.from(attributesNames);
    this.auditLogger.log(
      'decrypt_success',
      `Successfully decrypted attributes "[${attributesNamesArray}]" for saved object "${type}:${id}".`,
      { id, type, attributesNames: attributesNamesArray }
    );
  }
}
