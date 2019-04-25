/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import nodeCrypto from '@elastic/node-crypto';
import typeDetect from 'type-detect';
import { Server } from 'kibana';
import { EncryptedSavedObjectsAuditLogger } from './encrypted_saved_objects_audit_logger';
import { EncryptionError } from './encryption_error';

/**
 * Describes the registration entry for the saved object type that contain attributes that need to
 * be encrypted.
 */
export interface EncryptedSavedObjectTypeRegistration {
  readonly type: string;
  readonly attributesToEncrypt: ReadonlySet<string>;
  readonly attributesToExcludeFromAAD?: ReadonlySet<string>;
}

/**
 * Represents the service that tracks all saved object types that might contain attributes that need
 * to be encrypted before they are stored and eventually decrypted when retrieved. The service
 * performs encryption only based on registered saved object types that are known to contain such
 * attributes.
 */
export class EncryptedSavedObjectsService {
  private readonly crypto: Readonly<{
    encrypt<T>(valueToEncrypt: T, aad?: string): Promise<string>;
    decrypt<T>(valueToDecrypt: string, aad?: string): Promise<T>;
  }>;

  /**
   * Map of all registered saved object types where the `key` is saved object type and the `value`
   * is the registration parameters (names of attributes that need to be encrypted etc.).
   */
  private readonly typeRegistrations: Map<string, EncryptedSavedObjectTypeRegistration> = new Map();

  /**
   * @param encryptionKey The key used to encrypt and decrypt saved objects attributes.
   * @param knownTypes The list of all known saved object types.
   * @param log Ordinary logger instance.
   * @param audit Audit logger instance.
   */
  constructor(
    encryptionKey: string,
    private readonly knownTypes: ReadonlyArray<string>,
    private readonly log: Server.Logger,
    private readonly audit: EncryptedSavedObjectsAuditLogger
  ) {
    this.crypto = nodeCrypto({ encryptionKey });
  }

  /**
   * Registers saved object type as the one that contains attributes that should be encrypted.
   * @param typeRegistration Saved object type registration parameters.
   * @throws Will throw if `attributesToEncrypt` is empty.
   * @throws Will throw if the type is already registered.
   * @throws Will throw if the type is not known saved object type.
   */
  public registerType(typeRegistration: EncryptedSavedObjectTypeRegistration) {
    if (typeRegistration.attributesToEncrypt.size === 0) {
      throw new Error(`The "attributesToEncrypt" array for "${typeRegistration.type}" is empty.`);
    }

    if (this.typeRegistrations.has(typeRegistration.type)) {
      throw new Error(`The "${typeRegistration.type}" saved object type is already registered.`);
    }

    if (!this.knownTypes.includes(typeRegistration.type)) {
      throw new Error(`The type "${typeRegistration.type}" is not known saved object type.`);
    }

    this.typeRegistrations.set(typeRegistration.type, typeRegistration);
  }

  /**
   * Checks whether specified saved object type is registered as the one that contains attributes
   * that should be encrypted.
   * @param type Saved object type.
   */
  public isRegistered(type: string) {
    return this.typeRegistrations.has(type);
  }

  /**
   * Takes saved object attributes for the specified type and strips any of them that are supposed
   * to be encrypted and returns that __NEW__ attributes dictionary back.
   * @param type Type of the saved object to strip encrypted attributes from.
   * @param attributes Dictionary of __ALL__ saved object attributes.
   */
  public stripEncryptedAttributes<T extends Record<string, unknown>>(
    type: string,
    attributes: T
  ): Record<string, unknown> {
    const typeRegistration = this.typeRegistrations.get(type);
    if (typeRegistration === undefined) {
      return attributes;
    }

    const clonedAttributes: Record<string, unknown> = {};
    for (const [attributeName, attributeValue] of Object.entries(attributes)) {
      if (!typeRegistration.attributesToEncrypt.has(attributeName)) {
        clonedAttributes[attributeName] = attributeValue;
      }
    }

    return clonedAttributes;
  }

  /**
   * Takes saved object attributes for the specified type and encrypts all of them that are supposed
   * to be encrypted if any and returns that __NEW__ attributes dictionary back. If none of the
   * attributes were encrypted original attributes dictionary is returned.
   * @param type Type of the saved object to encrypt attributes for.
   * @param id Id of the saved object to strip encrypted attributes from.
   * @param attributes Dictionary of __ALL__ saved object attributes.
   * @throws Will throw if encryption fails for whatever reason.
   */
  public async encryptAttributes<T extends Record<string, unknown>>(
    type: string,
    id: string,
    attributes: T
  ): Promise<T> {
    const typeRegistration = this.typeRegistrations.get(type);
    if (typeRegistration === undefined) {
      return attributes;
    }

    const encryptionAAD = this.getAAD(typeRegistration, id, attributes);
    const encryptedAttributes: Record<string, string> = {};
    for (const attributeName of typeRegistration.attributesToEncrypt) {
      const attributeValue = attributes[attributeName];
      if (attributeValue != null) {
        try {
          encryptedAttributes[attributeName] = await this.crypto.encrypt(
            attributeValue,
            encryptionAAD
          );
        } catch (err) {
          this.log.error(`Failed to encrypt "${attributeName}" attribute: ${err.message || err}`);
          this.audit.encryptAttributeFailure(attributeName, type, id);

          throw new EncryptionError(
            `Unable to encrypt attribute "${attributeName}"`,
            attributeName,
            err
          );
        }
      }
    }

    // Normally we expect all registered to-be-encrypted attributes to be defined, but if it's
    // not the case we should collect and log them to make troubleshooting easier.
    const encryptedAttributesKeys = Array.from(Object.keys(encryptedAttributes));
    if (encryptedAttributesKeys.length !== typeRegistration.attributesToEncrypt.size) {
      this.log.debug(
        `The following attributes of saved object "${type}:${id}" should have been encrypted: ${Array.from(
          typeRegistration.attributesToEncrypt
        )}, but found only: ${encryptedAttributesKeys}`
      );
    }

    if (encryptedAttributesKeys.length === 0) {
      return attributes;
    }

    this.audit.encryptAttributesSuccess(encryptedAttributesKeys, type, id);

    return {
      ...attributes,
      ...encryptedAttributes,
    };
  }

  /**
   * Takes saved object attributes for the specified type and decrypts all of them that are supposed
   * to be encrypted if any and returns that __NEW__ attributes dictionary back. If none of the
   * attributes were decrypted original attributes dictionary is returned.
   * @param type Type of the saved object to decrypt attributes for.
   * @param id Id of the saved object to strip encrypted attributes from.
   * @param attributes Dictionary of __ALL__ saved object attributes.
   * @throws Will throw if decryption fails for whatever reason.
   * @throws Will throw if any of the attributes to decrypt is not a string.
   */
  public async decryptAttributes<T extends Record<string, unknown>>(
    type: string,
    id: string,
    attributes: T
  ): Promise<T> {
    const typeRegistration = this.typeRegistrations.get(type);
    if (typeRegistration === undefined) {
      return attributes;
    }

    const encryptionAAD = this.getAAD(typeRegistration, id, attributes);
    const decryptedAttributes: Record<string, string> = {};
    for (const attributeName of typeRegistration.attributesToEncrypt) {
      const attributeValue = attributes[attributeName];
      if (attributeValue == null) {
        continue;
      }

      if (typeof attributeValue !== 'string') {
        this.audit.decryptAttributeFailure(attributeName, type, id);
        throw new Error(
          `Encrypted "${attributeName}" attribute should be a string, but found ${typeDetect(
            attributeValue
          )}`
        );
      }

      try {
        decryptedAttributes[attributeName] = await this.crypto.decrypt(
          attributeValue,
          encryptionAAD
        );
      } catch (err) {
        this.log.error(`Failed to decrypt "${attributeName}" attribute: ${err.message || err}`);
        this.audit.decryptAttributeFailure(attributeName, type, id);

        throw new EncryptionError(
          `Unable to decrypt attribute "${attributeName}"`,
          attributeName,
          err
        );
      }
    }

    // Normally we expect all registered to-be-encrypted attributes to be defined, but if it's
    // not the case we should collect and log them to make troubleshooting easier.
    const decryptedAttributesKeys = Array.from(Object.keys(decryptedAttributes));
    if (decryptedAttributesKeys.length !== typeRegistration.attributesToEncrypt.size) {
      this.log.debug(
        `The following attributes of saved object "${type}:${id}" should have been decrypted: ${Array.from(
          typeRegistration.attributesToEncrypt
        )}, but found only: ${decryptedAttributesKeys}`
      );
    }

    if (decryptedAttributesKeys.length === 0) {
      return attributes;
    }

    this.audit.decryptAttributesSuccess(decryptedAttributesKeys, type, id);

    return {
      ...attributes,
      ...decryptedAttributes,
    };
  }

  /**
   * Generates string representation of the Additional Authenticated Data based on the specified saved
   * object type and attributes.
   * @param typeRegistration Saved object type registration parameters.
   * @param id Id of the saved object.
   * @param attributes All attributes of the saved object instance of the specified type.
   */
  private getAAD<T extends Record<string, unknown>>(
    typeRegistration: EncryptedSavedObjectTypeRegistration,
    id: string,
    attributes: T
  ) {
    // Collect all attributes (both keys and values) that should contribute to AAD.
    const attributesAAD = Array.from(Object.entries(attributes)).filter(([attributeKey]) => {
      return (
        !typeRegistration.attributesToEncrypt.has(attributeKey) &&
        (typeRegistration.attributesToExcludeFromAAD == null ||
          !typeRegistration.attributesToExcludeFromAAD.has(attributeKey))
      );
    });

    if (attributesAAD.length === 0) {
      this.log.debug(
        `The AAD for saved object "${typeRegistration.type}:${id}" does not include any attributes.`
      );
    }

    // TODO: Use JSON.stringify instead of template string? Slower, but respects value types, e.g.
    // Attributes: {prop1: 'prop1-value', prop2: 2}
    // With template string: "prop1,prop1-value,prop2,2"
    // With JSON.stringify:  "[[\"prop1\",\"prop1-value\"],[\"prop2\",2]]"
    return `${typeRegistration.type},${id},${attributesAAD}`;
  }
}
