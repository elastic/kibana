/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import nodeCrypto, { Crypto } from '@elastic/node-crypto';
import typeDetect from 'type-detect';
import { Logger } from 'src/core/server';
import { EncryptionError, EncryptionErrorOperation } from './encryption_error';
import { EncryptedSavedObjectAttributesDefinition } from './encrypted_saved_object_type_definition';
import { SavedObjectDescriptor, descriptorToArray } from './encrypted_saved_objects_service';
import { getAAD } from './get_aad';

/**
 * Represents the service that handles the migration of encrypted saved objects. The service
 * performs encryption based on registered saved object types that are known to contain such
 * attributes and on types provided by the migration.
 */
export class EncryptedSavedObjectsMigrationService {
  private readonly crypto: Readonly<Crypto>;

  /**
   * @param encryptionKey The key used to encrypt and decrypt saved objects attributes.
   * @param logger Ordinary logger instance.
   * @param service Encrypted Saved Objects Service instance.
   */
  constructor(encryptionKey: string, private readonly logger: Logger) {
    this.crypto = nodeCrypto({ encryptionKey });
  }

  /**
   * Takes saved object attributes for the specified type and encrypts all of them that are supposed
   * to be encrypted if any and returns that __NEW__ attributes dictionary back. If none of the
   * attributes were encrypted original attributes dictionary is returned.
   * @param descriptor Descriptor of the saved object to encrypt attributes for.
   * @param typeDefinition The TypeDefinition of the EncryptedSavedObject after its migration.
   * @param attributes Dictionary of __ALL__ saved object attributes.
   * @param [params] Additional parameters.
   * @throws Will throw if encryption fails for whatever reason.
   */
  public encryptAttributes<T extends Record<string, unknown>>(
    descriptor: SavedObjectDescriptor,
    typeDefinition: EncryptedSavedObjectAttributesDefinition,
    attributes: T
  ): T {
    const encryptionAAD = getAAD(typeDefinition, descriptor, attributes, this.logger);
    const encryptedAttributes: Record<string, string> = {};
    for (const attributeName of typeDefinition.attributesToEncrypt) {
      const attributeValue = attributes[attributeName];
      if (attributeValue != null) {
        try {
          encryptedAttributes[attributeName] = this.crypto.encryptSync(
            attributeValue,
            encryptionAAD
          );
        } catch (err) {
          this.logger.error(
            `Failed to encrypt "${attributeName}" attribute: ${err.message || err}`
          );

          throw new EncryptionError(
            `Unable to encrypt attribute "${attributeName}"`,
            attributeName,
            EncryptionErrorOperation.Encryption,
            err
          );
        }
      }
    }

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
   * @param typeDefinition The TypeDefinition of the EncryptedSavedObject before its migration.
   * @param attributes Dictionary of __ALL__ saved object attributes.
   * @param [params] Additional parameters.
   * @throws Will throw if decryption fails for whatever reason.
   * @throws Will throw if any of the attributes to decrypt is not a string.
   */
  public decryptAttributes<T extends Record<string, unknown>>(
    descriptor: SavedObjectDescriptor,
    typeDefinition: EncryptedSavedObjectAttributesDefinition,
    attributes: T
  ): T {
    const encryptionAAD = getAAD(typeDefinition, descriptor, attributes, this.logger);
    const decryptedAttributes: Record<string, string> = {};
    for (const attributeName of typeDefinition.attributesToEncrypt) {
      const attributeValue = attributes[attributeName];
      if (attributeValue == null) {
        continue;
      }

      if (typeof attributeValue !== 'string') {
        // this.audit.decryptAttributeFailure(attributeName, descriptor, params?.user);
        throw new Error(
          `Encrypted "${attributeName}" attribute should be a string, but found ${typeDetect(
            attributeValue
          )}`
        );
      }

      try {
        decryptedAttributes[attributeName] = this.crypto.decryptSync(
          attributeValue,
          encryptionAAD
        ) as string;
      } catch (err) {
        this.logger.error(`Failed to decrypt "${attributeName}" attribute: ${err.message || err}`);
        // this.audit.decryptAttributeFailure(attributeName, descriptor, params?.user);

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

    // this.audit.decryptAttributesSuccess(decryptedAttributesKeys, descriptor, params?.user);

    return {
      ...attributes,
      ...decryptedAttributes,
    };
  }
}
