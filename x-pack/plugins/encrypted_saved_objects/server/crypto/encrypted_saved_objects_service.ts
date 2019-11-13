/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import nodeCrypto from '@elastic/node-crypto';
import stringify from 'json-stable-stringify';
import typeDetect from 'type-detect';
import { Logger } from 'src/core/server';
import { EncryptedSavedObjectsAuditLogger } from '../audit';
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
 * Uniquely identifies saved object.
 */
export interface SavedObjectDescriptor {
  readonly id: string;
  readonly type: string;
  readonly namespace?: string;
}

/**
 * Utility function that gives array representation of the saved object descriptor respecting
 * optional `namespace` property.
 * @param descriptor Saved Object descriptor to turn into array.
 */
export function descriptorToArray(descriptor: SavedObjectDescriptor) {
  return descriptor.namespace
    ? [descriptor.namespace, descriptor.type, descriptor.id]
    : [descriptor.type, descriptor.id];
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
   * @param logger Ordinary logger instance.
   * @param audit Audit logger instance.
   */
  constructor(
    encryptionKey: string,
    private readonly logger: Logger,
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
   * @param descriptor Descriptor of the saved object to encrypt attributes for.
   * @param attributes Dictionary of __ALL__ saved object attributes.
   * @throws Will throw if encryption fails for whatever reason.
   */
  public async encryptAttributes<T extends Record<string, unknown>>(
    descriptor: SavedObjectDescriptor,
    attributes: T
  ): Promise<T> {
    const typeRegistration = this.typeRegistrations.get(descriptor.type);
    if (typeRegistration === undefined) {
      return attributes;
    }

    const encryptionAAD = this.getAAD(typeRegistration, descriptor, attributes);
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
          this.logger.error(
            `Failed to encrypt "${attributeName}" attribute: ${err.message || err}`
          );
          this.audit.encryptAttributeFailure(attributeName, descriptor);

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
    const encryptedAttributesKeys = Object.keys(encryptedAttributes);
    if (encryptedAttributesKeys.length !== typeRegistration.attributesToEncrypt.size) {
      this.logger.debug(
        `The following attributes of saved object "${descriptorToArray(
          descriptor
        )}" should have been encrypted: ${Array.from(
          typeRegistration.attributesToEncrypt
        )}, but found only: ${encryptedAttributesKeys}`
      );
    }

    if (encryptedAttributesKeys.length === 0) {
      return attributes;
    }

    this.audit.encryptAttributesSuccess(encryptedAttributesKeys, descriptor);

    return {
      ...attributes,
      ...encryptedAttributes,
    };
  }

  /**
   * Takes saved object attributes for the specified type and decrypts all of them that are supposed
   * to be encrypted if any and returns that __NEW__ attributes dictionary back. If none of the
   * attributes were decrypted original attributes dictionary is returned.
   * @param descriptor Descriptor of the saved object to decrypt attributes for.
   * @param attributes Dictionary of __ALL__ saved object attributes.
   * @throws Will throw if decryption fails for whatever reason.
   * @throws Will throw if any of the attributes to decrypt is not a string.
   */
  public async decryptAttributes<T extends Record<string, unknown>>(
    descriptor: SavedObjectDescriptor,
    attributes: T
  ): Promise<T> {
    const typeRegistration = this.typeRegistrations.get(descriptor.type);
    if (typeRegistration === undefined) {
      return attributes;
    }

    const encryptionAAD = this.getAAD(typeRegistration, descriptor, attributes);
    const decryptedAttributes: Record<string, string> = {};
    for (const attributeName of typeRegistration.attributesToEncrypt) {
      const attributeValue = attributes[attributeName];
      if (attributeValue == null) {
        continue;
      }

      if (typeof attributeValue !== 'string') {
        this.audit.decryptAttributeFailure(attributeName, descriptor);
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
        this.logger.error(`Failed to decrypt "${attributeName}" attribute: ${err.message || err}`);
        this.audit.decryptAttributeFailure(attributeName, descriptor);

        throw new EncryptionError(
          `Unable to decrypt attribute "${attributeName}"`,
          attributeName,
          err
        );
      }
    }

    // Normally we expect all registered to-be-encrypted attributes to be defined, but if it's
    // not the case we should collect and log them to make troubleshooting easier.
    const decryptedAttributesKeys = Object.keys(decryptedAttributes);
    if (decryptedAttributesKeys.length !== typeRegistration.attributesToEncrypt.size) {
      this.logger.debug(
        `The following attributes of saved object "${descriptorToArray(
          descriptor
        )}" should have been decrypted: ${Array.from(
          typeRegistration.attributesToEncrypt
        )}, but found only: ${decryptedAttributesKeys}`
      );
    }

    if (decryptedAttributesKeys.length === 0) {
      return attributes;
    }

    this.audit.decryptAttributesSuccess(decryptedAttributesKeys, descriptor);

    return {
      ...attributes,
      ...decryptedAttributes,
    };
  }

  /**
   * Generates string representation of the Additional Authenticated Data based on the specified saved
   * object type and attributes.
   * @param typeRegistration Saved object type registration parameters.
   * @param descriptor Descriptor of the saved object to get AAD for.
   * @param attributes All attributes of the saved object instance of the specified type.
   */
  private getAAD(
    typeRegistration: EncryptedSavedObjectTypeRegistration,
    descriptor: SavedObjectDescriptor,
    attributes: Record<string, unknown>
  ) {
    // Collect all attributes (both keys and values) that should contribute to AAD.
    const attributesAAD: Record<string, unknown> = {};
    for (const [attributeKey, attributeValue] of Object.entries(attributes)) {
      if (
        !typeRegistration.attributesToEncrypt.has(attributeKey) &&
        (typeRegistration.attributesToExcludeFromAAD == null ||
          !typeRegistration.attributesToExcludeFromAAD.has(attributeKey))
      ) {
        attributesAAD[attributeKey] = attributeValue;
      }
    }

    if (Object.keys(attributesAAD).length === 0) {
      this.logger.debug(
        `The AAD for saved object "${descriptorToArray(
          descriptor
        )}" does not include any attributes.`
      );
    }

    return stringify([...descriptorToArray(descriptor), attributesAAD]);
  }
}
