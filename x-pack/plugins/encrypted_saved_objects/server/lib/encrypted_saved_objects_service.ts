/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import nodeCrypto from '@elastic/node-crypto';
import typeDetect from 'type-detect';
import { Logger } from './logger';

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
   * @param logger Logger instance for ordinary and audit logging.
   */
  constructor(
    encryptionKey: string,
    private readonly knownTypes: ReadonlyArray<string>,
    private readonly logger: Logger
  ) {
    this.crypto = Object.freeze(nodeCrypto({ encryptionKey }));
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
   * Takes saved object attributes for the specified type and strips any of them that are supposed
   * to be encrypted and returns that __MUTATED__ attributes dictionary back.
   * @param type Type of the saved object to strip encrypted attributes from.
   * @param attributes Dictionary of __ALL__ saved object attributes.
   */
  public stripEncryptedAttributes<T extends Record<string, unknown>>(type: string, attributes: T) {
    const typeRegistration = this.typeRegistrations.get(type);
    if (typeRegistration === undefined) {
      return;
    }

    for (const attributeNameToEncrypt of typeRegistration.attributesToEncrypt) {
      delete attributes[attributeNameToEncrypt];
    }
  }

  /**
   * Takes saved object attributes for the specified type and encrypts all of them that are supposed
   * to be encrypted if any and returns that __MUTATED__ attributes dictionary back.
   * @param type Type of the saved object to encrypt attributes for.
   * @param attributes Dictionary of __ALL__ saved object attributes.
   * @param id Optional id of the saved object to strip encrypted attributes from.
   * @throws Will throw if encryption fails for whatever reason.
   */
  public async encryptAttributes<T extends Record<string, unknown>>(
    type: string,
    attributes: T,
    id?: string
  ) {
    const typeRegistration = this.typeRegistrations.get(type);
    if (typeRegistration === undefined) {
      return;
    }

    const encryptionAAD = this.getAAD(typeRegistration, attributes);
    const notDefinedAttributesToEncrypt = [];
    for (const attributeName of typeRegistration.attributesToEncrypt) {
      const attributeValue = attributes[attributeName];
      if (attributeValue != null) {
        try {
          attributes[attributeName] = await this.crypto.encrypt(attributeValue, encryptionAAD);
        } catch (err) {
          this.logger.audit.encryptAttributeFailure(attributeName, type, id);
          throw err;
        }
      } else {
        // Normally we expect all registered to-be-encrypted attributes to be defined, but if it's
        // not the case we should collect and log them to make troubleshooting easier.
        notDefinedAttributesToEncrypt.push(attributeName);
      }
    }

    if (notDefinedAttributesToEncrypt.length > 0) {
      this.logger.debug(
        `The following attributes of saved object "${type}:${id}"  were expected to be encrypted, but were not defined: ${notDefinedAttributesToEncrypt}`
      );
    }

    this.logger.audit.encryptAttributesSuccess(typeRegistration.attributesToEncrypt, type, id);
  }

  /**
   * Takes saved object attributes for the specified type and decrypts all of them that are supposed
   * to be encrypted if any and returns that __MUTATED__ attributes dictionary back.
   * @param type Type of the saved object to decrypt attributes for.
   * @param attributes Dictionary of __ALL__ saved object attributes.
   * @param id Id of the saved object to strip encrypted attributes from.
   * @throws Will throw if decryption fails for whatever reason.
   * @throws Will throw if any of the attributes to decrypt is not a string.
   */
  public async decryptAttributes<T extends Record<string, unknown>>(
    type: string,
    attributes: T,
    id: string
  ) {
    const typeRegistration = this.typeRegistrations.get(type);
    if (typeRegistration === undefined) {
      return;
    }

    const encryptionAAD = this.getAAD(typeRegistration, attributes);
    const notDefinedAttributesToDecrypt = [];
    for (const attributeName of typeRegistration.attributesToEncrypt) {
      const attributeValue = attributes[attributeName];
      if (attributeValue == null) {
        // Normally we expect all encrypted attributes to be defined and have a `string` type, but
        // if it's not the case we should collect and log them to make troubleshooting easier.
        notDefinedAttributesToDecrypt.push(attributeName);
      } else if (typeof attributeValue !== 'string') {
        this.logger.audit.decryptAttributeFailure(attributeName, type, id);
        throw new Error(
          `Encrypted "${attributeName}" attribute should be a string, but found ${typeDetect(
            attributeValue
          )}`
        );
      } else {
        try {
          attributes[attributeName] = await this.crypto.decrypt(attributeValue, encryptionAAD);
        } catch (err) {
          this.logger.audit.decryptAttributeFailure(attributeName, type, id);
          throw err;
        }
      }
    }

    if (notDefinedAttributesToDecrypt.length > 0) {
      this.logger.debug(
        `The following attributes of saved object "${type}:${id}" were expected to be decrypted, but were not defined: ${notDefinedAttributesToDecrypt}`
      );
    }

    this.logger.audit.decryptAttributesSuccess(typeRegistration.attributesToEncrypt, type, id);
  }

  /**
   * Generates string representation of the Additional Authenticated Data based on the specified saved
   * object type and attributes.
   * @param typeRegistration Saved object type registration parameters.
   * @param attributes All attributes of the saved object instance of the specified type.
   */
  private getAAD<T extends Record<string, unknown>>(
    typeRegistration: EncryptedSavedObjectTypeRegistration,
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

    // TODO: We can't include `id` into AAD since it may not be specified when saved object is created.

    // TODO: Use JSON.stringify instead of template string? Slower, but respects value types, e.g.
    // Attributes: {prop1: 'prop1-value', prop2: 2}
    // With template string: "prop1,prop1-value,prop2,2"
    // With JSON.stringify:  "[[\"prop1\",\"prop1-value\"],[\"prop2\",2]]"
    return `${typeRegistration.type},${attributesAAD}`;
  }
}
