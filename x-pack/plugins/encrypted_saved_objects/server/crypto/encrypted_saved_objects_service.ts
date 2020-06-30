/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Crypto, EncryptOutput } from '@elastic/node-crypto';
import typeDetect from 'type-detect';
import stringify from 'json-stable-stringify';
import { Logger } from 'src/core/server';
import { AuthenticatedUser } from '../../../security/common/model';
import { EncryptedSavedObjectsAuditLogger } from '../audit';
import { EncryptionError, EncryptionErrorOperation } from './encryption_error';
import { EncryptedSavedObjectAttributesDefinition } from './encrypted_saved_object_type_definition';

/**
 * Describes the attributes to encrypt. By default, attribute values won't be exposed to end-users
 * and can only be consumed by the internal Kibana server. If end-users should have access to the
 * encrypted values use `dangerouslyExposeValue: true`
 */
export interface AttributeToEncrypt {
  readonly key: string;
  readonly dangerouslyExposeValue?: boolean;
}

/**
 * Describes the registration entry for the saved object type that contain attributes that need to
 * be encrypted.
 */
export interface EncryptedSavedObjectTypeRegistration {
  readonly type: string;
  readonly attributesToEncrypt: ReadonlySet<string | AttributeToEncrypt>;
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
 * Describes parameters that are common for all EncryptedSavedObjectsService public methods.
 */
interface CommonParameters {
  /**
   * User on behalf of the method is called if determined.
   */
  user?: AuthenticatedUser;
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
  /**
   * Map of all registered saved object types where the `key` is saved object type and the `value`
   * is the definition (names of attributes that need to be encrypted etc.).
   */
  private readonly typeDefinitions: Map<
    string,
    EncryptedSavedObjectAttributesDefinition
  > = new Map();

  /**
   * @param crypto nodeCrypto instance.
   * @param logger Ordinary logger instance.
   * @param audit Audit logger instance.
   */
  constructor(
    private readonly crypto: Readonly<Crypto>,
    private readonly logger: Logger,
    private readonly audit: EncryptedSavedObjectsAuditLogger
  ) {}

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

    if (this.typeDefinitions.has(typeRegistration.type)) {
      throw new Error(`The "${typeRegistration.type}" saved object type is already registered.`);
    }

    this.typeDefinitions.set(
      typeRegistration.type,
      new EncryptedSavedObjectAttributesDefinition(typeRegistration)
    );
  }

  /**
   * Checks whether specified saved object type is registered as the one that contains attributes
   * that should be encrypted.
   * @param type Saved object type.
   */
  public isRegistered(type: string) {
    return this.typeDefinitions.has(type);
  }

  /**
   * Takes saved object attributes for the specified type and, depending on the type definition,
   * either decrypts or strips encrypted attributes (e.g. in case AAD or encryption key has changed
   * and decryption is no longer possible).
   * @param descriptor Saved object descriptor (ID, type and optional namespace)
   * @param attributes Object that includes a dictionary of __ALL__ saved object attributes stored
   * in Elasticsearch.
   * @param [originalAttributes] An optional dictionary of __ALL__ saved object original attributes
   * that were used to create that saved object (i.e. values are NOT encrypted).
   * @param [params] Parameters that control the way encrypted attributes are handled.
   */
  public async stripOrDecryptAttributes<T extends Record<string, unknown>>(
    descriptor: SavedObjectDescriptor,
    attributes: T,
    originalAttributes?: T,
    params?: CommonParameters
  ) {
    const typeDefinition = this.typeDefinitions.get(descriptor.type);
    if (typeDefinition === undefined) {
      return { attributes };
    }

    let decryptedAttributes: T | null = null;
    let decryptionError: Error | undefined;
    const clonedAttributes: Record<string, unknown> = {};
    for (const [attributeName, attributeValue] of Object.entries(attributes)) {
      // We should strip encrypted attribute if definition explicitly mandates that or decryption
      // failed.
      if (
        typeDefinition.shouldBeStripped(attributeName) ||
        (!!decryptionError && typeDefinition.shouldBeEncrypted(attributeName))
      ) {
        continue;
      }

      // If attribute isn't supposed to be encrypted, just copy it to the resulting attribute set.
      if (!typeDefinition.shouldBeEncrypted(attributeName)) {
        clonedAttributes[attributeName] = attributeValue;
      } else if (originalAttributes) {
        // If attribute should be decrypted, but we have original attributes used to create object
        // we should get raw unencrypted value from there to avoid performance penalty.
        clonedAttributes[attributeName] = originalAttributes[attributeName];
      } else {
        // Otherwise just try to decrypt attribute. We decrypt all attributes at once, cache it and
        // reuse for any other attributes.
        if (decryptedAttributes === null) {
          try {
            decryptedAttributes = await this.decryptAttributes(
              descriptor,
              // Decrypt only attributes that are supposed to be exposed.
              Object.fromEntries(
                Object.entries(attributes).filter(([key]) => !typeDefinition.shouldBeStripped(key))
              ) as T,
              { user: params?.user }
            );
          } catch (err) {
            decryptionError = err;
            continue;
          }
        }

        clonedAttributes[attributeName] = decryptedAttributes[attributeName];
      }
    }

    return { attributes: clonedAttributes as T, error: decryptionError };
  }

  private *attributesToEncryptIterator<T extends Record<string, unknown>>(
    descriptor: SavedObjectDescriptor,
    attributes: T,
    params?: CommonParameters
  ): Iterator<[unknown, string], T, string> {
    const typeDefinition = this.typeDefinitions.get(descriptor.type);
    if (typeDefinition === undefined) {
      return attributes;
    }

    const encryptionAAD = this.getAAD(typeDefinition, descriptor, attributes);
    const encryptedAttributes: Record<string, string> = {};
    for (const attributeName of typeDefinition.attributesToEncrypt) {
      const attributeValue = attributes[attributeName];
      if (attributeValue != null) {
        try {
          encryptedAttributes[attributeName] = (yield [attributeValue, encryptionAAD])!;
        } catch (err) {
          this.logger.error(
            `Failed to encrypt "${attributeName}" attribute: ${err.message || err}`
          );
          this.audit.encryptAttributeFailure(attributeName, descriptor, params?.user);

          throw new EncryptionError(
            `Unable to encrypt attribute "${attributeName}"`,
            attributeName,
            EncryptionErrorOperation.Encryption,
            err
          );
        }
      }
    }

    // Normally we expect all registered to-be-encrypted attributes to be defined, but if it's
    // not the case we should collect and log them to make troubleshooting easier.
    const encryptedAttributesKeys = Object.keys(encryptedAttributes);
    if (encryptedAttributesKeys.length !== typeDefinition.attributesToEncrypt.size) {
      this.logger.debug(
        `The following attributes of saved object "${descriptorToArray(
          descriptor
        )}" should have been encrypted: ${Array.from(
          typeDefinition.attributesToEncrypt
        )}, but found only: ${encryptedAttributesKeys}`
      );
    }

    if (encryptedAttributesKeys.length === 0) {
      return attributes;
    }

    this.audit.encryptAttributesSuccess(encryptedAttributesKeys, descriptor, params?.user);

    return {
      ...attributes,
      ...encryptedAttributes,
    };
  }

  /**
   * Takes saved object attributes for the specified type and encrypts all of them that are supposed
   * to be encrypted if any and returns that __NEW__ attributes dictionary back. If none of the
   * attributes were encrypted original attributes dictionary is returned.
   * @param descriptor Descriptor of the saved object to encrypt attributes for.
   * @param attributes Dictionary of __ALL__ saved object attributes.
   * @param [params] Additional parameters.
   * @throws Will throw if encryption fails for whatever reason.
   */
  public async encryptAttributes<T extends Record<string, unknown>>(
    descriptor: SavedObjectDescriptor,
    attributes: T,
    params?: CommonParameters
  ): Promise<T> {
    const iterator = this.attributesToEncryptIterator<T>(descriptor, attributes, params);

    let iteratorResult = iterator.next();
    while (!iteratorResult.done) {
      const [attributeValue, encryptionAAD] = iteratorResult.value;
      try {
        iteratorResult = iterator.next(await this.crypto.encrypt(attributeValue, encryptionAAD));
      } catch (err) {
        iterator.throw!(err);
      }
    }

    return iteratorResult.value;
  }

  /**
   * Takes saved object attributes for the specified type and encrypts all of them that are supposed
   * to be encrypted if any and returns that __NEW__ attributes dictionary back. If none of the
   * attributes were encrypted original attributes dictionary is returned.
   * @param descriptor Descriptor of the saved object to encrypt attributes for.
   * @param attributes Dictionary of __ALL__ saved object attributes.
   * @param [params] Additional parameters.
   * @throws Will throw if encryption fails for whatever reason.
   */
  public encryptAttributesSync<T extends Record<string, unknown>>(
    descriptor: SavedObjectDescriptor,
    attributes: T,
    params?: CommonParameters
  ): T {
    const iterator = this.attributesToEncryptIterator<T>(descriptor, attributes, params);

    let iteratorResult = iterator.next();
    while (!iteratorResult.done) {
      const [attributeValue, encryptionAAD] = iteratorResult.value;
      try {
        iteratorResult = iterator.next(this.crypto.encryptSync(attributeValue, encryptionAAD));
      } catch (err) {
        iterator.throw!(err);
      }
    }

    return iteratorResult.value;
  }

  /**
   * Takes saved object attributes for the specified type and decrypts all of them that are supposed
   * to be encrypted if any and returns that __NEW__ attributes dictionary back. If none of the
   * attributes were decrypted original attributes dictionary is returned.
   * @param descriptor Descriptor of the saved object to decrypt attributes for.
   * @param attributes Dictionary of __ALL__ saved object attributes.
   * @param [params] Additional parameters.
   * @throws Will throw if decryption fails for whatever reason.
   * @throws Will throw if any of the attributes to decrypt is not a string.
   */
  public async decryptAttributes<T extends Record<string, unknown>>(
    descriptor: SavedObjectDescriptor,
    attributes: T,
    params?: CommonParameters
  ): Promise<T> {
    const iterator = this.attributesToDecryptIterator<T>(descriptor, attributes, params);

    let iteratorResult = iterator.next();
    while (!iteratorResult.done) {
      const [attributeValue, encryptionAAD] = iteratorResult.value;
      try {
        iteratorResult = iterator.next(
          (await this.crypto.decrypt(attributeValue, encryptionAAD)) as string
        );
      } catch (err) {
        iterator.throw!(err);
      }
    }

    return iteratorResult.value;
  }

  /**
   * Takes saved object attributes for the specified type and decrypts all of them that are supposed
   * to be encrypted if any and returns that __NEW__ attributes dictionary back. If none of the
   * attributes were decrypted original attributes dictionary is returned.
   * @param descriptor Descriptor of the saved object to decrypt attributes for.
   * @param attributes Dictionary of __ALL__ saved object attributes.
   * @param [params] Additional parameters.
   * @throws Will throw if decryption fails for whatever reason.
   * @throws Will throw if any of the attributes to decrypt is not a string.
   */
  public decryptAttributesSync<T extends Record<string, unknown>>(
    descriptor: SavedObjectDescriptor,
    attributes: T,
    params?: CommonParameters
  ): T {
    const iterator = this.attributesToDecryptIterator<T>(descriptor, attributes, params);

    let iteratorResult = iterator.next();
    while (!iteratorResult.done) {
      const [attributeValue, encryptionAAD] = iteratorResult.value;
      try {
        iteratorResult = iterator.next(this.crypto.decryptSync(attributeValue, encryptionAAD));
      } catch (err) {
        iterator.throw!(err);
      }
    }

    return iteratorResult.value;
  }

  private *attributesToDecryptIterator<T extends Record<string, unknown>>(
    descriptor: SavedObjectDescriptor,
    attributes: T,
    params?: CommonParameters
  ): Iterator<[string, string], T, EncryptOutput> {
    const typeDefinition = this.typeDefinitions.get(descriptor.type);
    if (typeDefinition === undefined) {
      return attributes;
    }

    const encryptionAAD = this.getAAD(typeDefinition, descriptor, attributes);
    const decryptedAttributes: Record<string, EncryptOutput> = {};
    for (const attributeName of typeDefinition.attributesToEncrypt) {
      const attributeValue = attributes[attributeName];
      if (attributeValue == null) {
        continue;
      }

      if (typeof attributeValue !== 'string') {
        this.audit.decryptAttributeFailure(attributeName, descriptor, params?.user);
        throw new Error(
          `Encrypted "${attributeName}" attribute should be a string, but found ${typeDetect(
            attributeValue
          )}`
        );
      }

      try {
        decryptedAttributes[attributeName] = (yield [attributeValue, encryptionAAD])!;
      } catch (err) {
        this.logger.error(`Failed to decrypt "${attributeName}" attribute: ${err.message || err}`);
        this.audit.decryptAttributeFailure(attributeName, descriptor, params?.user);

        throw new EncryptionError(
          `Unable to decrypt attribute "${attributeName}"`,
          attributeName,
          EncryptionErrorOperation.Decryption,
          err
        );
      }
    }

    // Normally we expect all registered to-be-encrypted attributes to be defined, but if it's
    // not the case we should collect and log them to make troubleshooting easier.
    const decryptedAttributesKeys = Object.keys(decryptedAttributes);
    if (decryptedAttributesKeys.length !== typeDefinition.attributesToEncrypt.size) {
      this.logger.debug(
        `The following attributes of saved object "${descriptorToArray(
          descriptor
        )}" should have been decrypted: ${Array.from(
          typeDefinition.attributesToEncrypt
        )}, but found only: ${decryptedAttributesKeys}`
      );
    }

    if (decryptedAttributesKeys.length === 0) {
      return attributes;
    }

    this.audit.decryptAttributesSuccess(decryptedAttributesKeys, descriptor, params?.user);

    return {
      ...attributes,
      ...decryptedAttributes,
    };
  }

  /**
   * Generates string representation of the Additional Authenticated Data based on the specified saved
   * object type and attributes.
   * @param typeDefinition Encrypted saved object type definition.
   * @param descriptor Descriptor of the saved object to get AAD for.
   * @param attributes All attributes of the saved object instance of the specified type.
   */
  private getAAD(
    typeDefinition: EncryptedSavedObjectAttributesDefinition,
    descriptor: SavedObjectDescriptor,
    attributes: Record<string, unknown>
  ) {
    // Collect all attributes (both keys and values) that should contribute to AAD.
    const attributesAAD: Record<string, unknown> = {};
    for (const [attributeKey, attributeValue] of Object.entries(attributes)) {
      if (!typeDefinition.shouldBeExcludedFromAAD(attributeKey)) {
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
