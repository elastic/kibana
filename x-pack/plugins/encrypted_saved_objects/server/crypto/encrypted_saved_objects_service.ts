/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Crypto, EncryptOutput } from '@elastic/node-crypto';
import stringify from 'json-stable-stringify';
import typeDetect from 'type-detect';

import type {
  ISavedObjectsRepository,
  Logger,
  SavedObject,
  SavedObjectsBulkCreateObject,
  SavedObjectsServiceStart,
} from '@kbn/core/server';
import type { AuthenticatedUser } from '@kbn/security-plugin/common/model';

import { VERSIONED_ENCYRPTION_DEFINITION_TYPE } from '../saved_objects';
import { EncryptedSavedObjectAttributesDefinition } from './encrypted_saved_object_type_definition';
import { EncryptionError, EncryptionErrorOperation } from './encryption_error';

export const ENCRPYPTED_HEADER_EOH: string = '.EOH.';

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
  readonly modelVersion?: string;
}

/**
 * Embedding excluded AAD fields POC rev2
 * Interface for writing/reading versioned ESO type metada
 * to/from hidden saved objects
 */
interface EncryptedSavedObjectVersionedMetadata {
  readonly type: string;
  readonly modelVersion: string;
  readonly attributesToEncrypt: string[];
  readonly attributesToExcludeFromAAD: string[];
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
 * Describes parameters for the decrypt methods.
 */
interface DecryptParameters extends CommonParameters {
  /**
   * Indicates whether decryption should only be performed using secondary decryption-only keys.
   */
  omitPrimaryEncryptionKey?: boolean;
  /**
   * Indicates whether the object to be decrypted is being converted from a single-namespace type to a multi-namespace type. In this case,
   * we may need to attempt decryption twice: once with a namespace in the descriptor (for use during index migration), and again without a
   * namespace in the descriptor (for use during object migration). In other words, if the object is being decrypted during index migration,
   * the object was previously encrypted with its namespace in the descriptor portion of the AAD; on the other hand, if the object is being
   * decrypted during object migration, the object was never encrypted with its namespace in the descriptor portion of the AAD.
   */
  isTypeBeingConverted?: boolean;
  /**
   * If the originId (old object ID) is present and the object is being converted from a single-namespace type to a multi-namespace type,
   * we will attempt to decrypt with both the old object ID and the current object ID.
   */
  originId?: string;
}

interface EncryptedSavedObjectsServiceOptions {
  /**
   * Service logger instance.
   */
  logger: Logger;

  /**
   * NodeCrypto instance used for both encryption and decryption.
   */
  primaryCrypto?: Crypto;

  /**
   * NodeCrypto instances used ONLY for decryption (i.e. rotated encryption keys).
   */
  decryptionOnlyCryptos?: Readonly<Crypto[]>;
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
  // Embedding excluded AAD fields POC rev2
  // We need an internal repo to write and read the versioned ESO descriptors
  private internalSoRepository?: ISavedObjectsRepository;

  // Embedding excluded AAD fields POC rev2
  // Metadata is stored in an SO. Ehen we read one, we'll
  // cache it in versionedAttributeDefinitions
  private readonly versionedAttributeDefinitions: Map<
    string,
    EncryptedSavedObjectAttributesDefinition
  > = new Map();

  /**
   * Map of all registered saved object types where the `key` is saved object type and the `value`
   * is the definition (names of attributes that need to be encrypted etc.).
   */
  private readonly typeDefinitions: Map<string, EncryptedSavedObjectAttributesDefinition> =
    new Map();

  constructor(private readonly options: EncryptedSavedObjectsServiceOptions) {}

  // Embedding excluded AAD fields POC rev2
  // Get and cache the metadata for a version of an ESO
  private async getVersionedAttributeDefinition(
    type: string,
    modelVersion: string
  ): Promise<EncryptedSavedObjectAttributesDefinition | undefined> {
    if (!this.internalSoRepository) return undefined;

    const id = type + modelVersion;
    if (this.versionedAttributeDefinitions.has(id)) this.versionedAttributeDefinitions.get(id);

    try {
      // In actual implementation we could use find to match the type/version we're
      // looking for. In the POC I've just hard-coded the ID of the objects.
      const metadataObject: SavedObject<any> = await this.internalSoRepository.get(
        VERSIONED_ENCYRPTION_DEFINITION_TYPE,
        id
      );

      // Convert the SO attributes to a EncryptedSavedObjectAttributesDefinition
      // this makes our life easier when we attempt decryption
      const metadataAttributesDef = new EncryptedSavedObjectAttributesDefinition({
        type: metadataObject.attributes.type,
        attributesToEncrypt: new Set(metadataObject.attributes.attributesToEncrypt),
        attributesToExcludeFromAAD: new Set(metadataObject.attributes.attributesToExcludeFromAAD),
        modelVersion: metadataObject.attributes.modelVersion,
      });

      // Cache the versioned definition
      this.versionedAttributeDefinitions.set(id, metadataAttributesDef);
      return metadataAttributesDef;
    } catch (e) {
      return undefined;
    }
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

  // Embedding excluded AAD fields POC rev2
  // Initializes versioned type storage/caching
  // Creates an internal SO repository to write/read the hidden encrpytion
  // descriptors which contain per-version encrypted fields and AAD metadata
  public async initializeVersionedMetadata(savedObjects: SavedObjectsServiceStart) {
    this.internalSoRepository = savedObjects.createInternalRepository([
      VERSIONED_ENCYRPTION_DEFINITION_TYPE,
    ]);

    const versionedEsoMetadata = new Array<SavedObjectsBulkCreateObject>();

    this.typeDefinitions.forEach((versionedType) => {
      if (versionedType.modelVersion) {
        const attributes: EncryptedSavedObjectVersionedMetadata = {
          type: versionedType.type,
          modelVersion: versionedType.modelVersion,
          attributesToEncrypt: [...versionedType.attributesToEncrypt.values()],
          attributesToExcludeFromAAD: versionedType.getAttributesToExcludeFromAAD(),
        };
        const id = versionedType.type + versionedType.modelVersion; // forcing the ID in this POC
        versionedEsoMetadata.push({ id, type: VERSIONED_ENCYRPTION_DEFINITION_TYPE, attributes });
      }
    });

    // What is the risk of not awaiting this call?
    // Where could we call this function where we can await it?
    // This function (initializeVersionedMetadata) is being called from ESO plugin start.
    await this.internalSoRepository.bulkCreate(versionedEsoMetadata, { overwrite: true });
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
    attributesToStripOrDecrypt: T,
    originalAttributes?: T,
    params?: DecryptParameters
  ) {
    const { attributes, attributesToDecrypt } = this.prepareAttributesForStripOrDecrypt(
      descriptor,
      attributesToStripOrDecrypt,
      originalAttributes
    );
    try {
      const decryptedAttributes = attributesToDecrypt
        ? await this.decryptAttributes(descriptor, attributesToDecrypt, params)
        : {};
      return { attributes: { ...attributes, ...decryptedAttributes } };
    } catch (error) {
      return { attributes, error };
    }
  }

  /**
   * Takes saved object attributes for the specified type and, depending on the type definition,
   * either decrypts or strips encrypted attributes (e.g. in case AAD or encryption key has changed
   * and decryption is no longer possible).
   * @param descriptor Saved object descriptor (ID, type and optional namespace)
   * @param attributesToStripOrDecrypt Object that includes a dictionary of __ALL__ saved object attributes stored
   * in Elasticsearch.
   * @param [originalAttributes] An optional dictionary of __ALL__ saved object original attributes
   * that were used to create that saved object (i.e. values are NOT encrypted).
   * @param [params] Parameters that control the way encrypted attributes are handled.
   */
  public stripOrDecryptAttributesSync<T extends Record<string, unknown>>(
    descriptor: SavedObjectDescriptor,
    attributesToStripOrDecrypt: T,
    originalAttributes?: T,
    params?: DecryptParameters
  ) {
    const { attributes, attributesToDecrypt } = this.prepareAttributesForStripOrDecrypt(
      descriptor,
      attributesToStripOrDecrypt,
      originalAttributes
    );
    try {
      const decryptedAttributes = attributesToDecrypt
        ? this.decryptAttributesSync(descriptor, attributesToDecrypt, params)
        : {};
      return { attributes: { ...attributes, ...decryptedAttributes } };
    } catch (error) {
      return { attributes, error };
    }
  }

  /**
   * Takes saved object attributes for the specified type and, depending on the type definition,
   * either strips encrypted attributes, replaces with original decrypted value if available, or
   * prepares them for decryption.
   * @private
   */
  private prepareAttributesForStripOrDecrypt<T extends Record<string, unknown>>(
    descriptor: SavedObjectDescriptor,
    attributes: T,
    originalAttributes?: T
  ) {
    const typeDefinition = this.typeDefinitions.get(descriptor.type);
    if (typeDefinition === undefined) {
      return { attributes, attributesToDecrypt: null };
    }

    let attributesToDecrypt: T | undefined;
    const clonedAttributes: Record<string, unknown> = {};
    for (const [attributeName, attributeValue] of Object.entries(attributes)) {
      // We should strip encrypted attribute if definition explicitly mandates that.
      if (typeDefinition.shouldBeStripped(attributeName)) {
        continue;
      }

      // If attribute isn't supposed to be encrypted, just copy it to the resulting attribute set.
      if (!typeDefinition.shouldBeEncrypted(attributeName)) {
        clonedAttributes[attributeName] = attributeValue;
      } else if (originalAttributes) {
        // If attribute should be decrypted, but we have original attributes used to create object
        // we should get raw unencrypted value from there to avoid performance penalty.
        clonedAttributes[attributeName] = originalAttributes[attributeName];
      } else if (!attributesToDecrypt) {
        // Decrypt only attributes that are supposed to be exposed.
        attributesToDecrypt = Object.fromEntries(
          Object.entries(attributes).filter(([key]) => !typeDefinition.shouldBeStripped(key))
        ) as T;
      }
    }

    return {
      attributes: clonedAttributes as T,
      attributesToDecrypt:
        attributesToDecrypt && Object.keys(attributesToDecrypt).length > 0
          ? attributesToDecrypt
          : null,
    };
  }

  // Embedding excluded AAD fields POC
  // The private members are helpers for the POC that embed and exctract
  // the AAD exclusions to/from the encrypted data strings
  // This POC is NOT a suggested solution - it duplicates the ADD meta data in
  // each encrpyted attribute. Ideally, we should store it only once.
  // private createEncryptionHeader(attributesToExcludeFromAAD: string[] | undefined): string {
  //   if (!attributesToExcludeFromAAD || attributesToExcludeFromAAD.length === 0) return '';
  //   return attributesToExcludeFromAAD
  //     .join(ENCRPYPTED_HEADER_DELIMITER)
  //     .concat(ENCRPYPTED_HEADER_EOH);
  // }

  // Embedding excluded AAD fields POC v2
  // The header now only needs to contain the version (to simulate the model version
  // that would be written to the raw SO doc)
  private createModelVersionHeader(modelVersion?: string): string {
    if (!modelVersion) return '';
    return modelVersion.concat(ENCRPYPTED_HEADER_EOH);
  }
  private extractModelVersionFromHeader(encryptionString: string): {
    modelVersion: string | undefined;
    encryptedData: string;
  } {
    const parts = encryptionString.split(ENCRPYPTED_HEADER_EOH);
    if (parts.length <= 1) return { modelVersion: undefined, encryptedData: encryptionString };
    return {
      modelVersion: parts[0],
      encryptedData: parts[1],
    };
  }

  private *attributesToEncryptIterator<T extends Record<string, unknown>>(
    descriptor: SavedObjectDescriptor,
    attributes: T,
    params?: CommonParameters,
    modelVersion?: string
  ): Iterator<[unknown, string], T, string> {
    const typeDefinition = this.typeDefinitions.get(descriptor.type);
    if (typeDefinition === undefined) {
      return attributes;
    }
    let encryptionAAD: string | undefined;
    const encryptionHeader = this.createModelVersionHeader(modelVersion);

    const encryptedAttributes: Record<string, string> = {};
    for (const attributeName of typeDefinition.attributesToEncrypt) {
      const attributeValue = attributes[attributeName];
      if (attributeValue != null) {
        if (!encryptionAAD) {
          encryptionAAD = this.getAAD(typeDefinition, descriptor, attributes);
        }
        try {
          // Embedding excluded AAD fields POC v2
          // Here we prefix the encrypted data with the version string that was registered in this instance
          // This will not be necessary in the real implementation, as the model version would be available
          // from the raw SO soc.
          encryptedAttributes[attributeName] = encryptionHeader.concat(
            (yield [attributeValue, encryptionAAD])!
          );
        } catch (err) {
          this.options.logger.error(
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

    // Normally we expect all registered to-be-encrypted attributes to be defined, but if it's
    // not the case we should collect and log them to make troubleshooting easier.
    const encryptedAttributesKeys = Object.keys(encryptedAttributes);
    if (encryptedAttributesKeys.length !== typeDefinition.attributesToEncrypt.size) {
      this.options.logger.debug(
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

    return { ...attributes, ...encryptedAttributes };
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
    // Embedding excluded AAD fields POC v2
    // Determine if there is a model version, and pass it into the iterator
    const esoDef = this.typeDefinitions.get(descriptor.type);
    const iterator = this.attributesToEncryptIterator<T>(
      descriptor,
      attributes,
      params,
      esoDef?.modelVersion
    );

    let iteratorResult = iterator.next();
    while (!iteratorResult.done) {
      const [attributeValue, encryptionAAD] = iteratorResult.value;
      // We check this inside of the iterator to throw only if we do need to encrypt anything.
      if (this.options.primaryCrypto) {
        try {
          iteratorResult = iterator.next(
            await this.options.primaryCrypto.encrypt(attributeValue, encryptionAAD)
          );
        } catch (err) {
          iterator.throw!(err);
        }
      } else {
        iterator.throw!(new Error('Encryption is disabled because of missing encryption key.'));
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
    // Embedding excluded AAD fields POC v2
    // No additional considerations are made for sync functions, as they are only
    // utilized in migrations, before we have any access to the SO repo
    const iterator = this.attributesToEncryptIterator<T>(descriptor, attributes, params);

    let iteratorResult = iterator.next();
    while (!iteratorResult.done) {
      const [attributeValue, encryptionAAD] = iteratorResult.value;
      // We check this inside of the iterator to throw only if we do need to encrypt anything.
      if (this.options.primaryCrypto) {
        try {
          iteratorResult = iterator.next(
            this.options.primaryCrypto.encryptSync(attributeValue, encryptionAAD)
          );
        } catch (err) {
          iterator.throw!(err);
        }
      } else {
        iterator.throw!(new Error('Encryption is disabled because of missing encryption key.'));
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
    params?: DecryptParameters
  ): Promise<T> {
    // Embedding excluded AAD fields POC v2
    // Determine if there is a model version embedded into any of the encrypted fields.
    // The POC operates under the assumption that the list of encrpted fields for a type
    // are only ever augmented in new model versions.
    let modelVersion: string | undefined;
    const esoDef = this.typeDefinitions.get(descriptor.type);
    const encryptedAttributes = esoDef ? [...esoDef.attributesToEncrypt] : [];

    for (const attributeName of encryptedAttributes) {
      const attributeValue = attributes[attributeName];
      if (attributeValue == null || typeof attributeValue !== 'string') {
        continue;
      }

      ({ modelVersion } = this.extractModelVersionFromHeader(attributeValue));
      if (!!modelVersion) break;
    }

    // If there is a model version, then get the versioned metadata and pass it to
    // the decrypt iterator
    let metadata: EncryptedSavedObjectAttributesDefinition | undefined;
    if (!!modelVersion && modelVersion !== esoDef?.modelVersion) {
      metadata = await this.getVersionedAttributeDefinition(descriptor.type, modelVersion);
    }

    const decrypters = this.getDecrypters(params?.omitPrimaryEncryptionKey);
    const iterator = this.attributesToDecryptIterator<T>(descriptor, attributes, params, metadata);

    let iteratorResult = iterator.next();
    while (!iteratorResult.done) {
      const [attributeValue, encryptionAADs] = iteratorResult.value;

      // We check this inside of the iterator to throw only if we do need to decrypt anything.
      let decryptionError =
        decrypters.length === 0
          ? new Error('Decryption is disabled because of missing decryption keys.')
          : undefined;
      const decryptersPerAAD = decrypters.flatMap((decr) =>
        encryptionAADs.map((aad) => [decr, aad] as [Crypto, string])
      );
      for (const [decrypter, encryptionAAD] of decryptersPerAAD) {
        try {
          iteratorResult = iterator.next(await decrypter.decrypt(attributeValue, encryptionAAD));
          decryptionError = undefined;
          break;
        } catch (err) {
          // Remember the error thrown when we tried to decrypt with the primary key.
          if (!decryptionError) {
            decryptionError = err;
          }
        }
      }

      if (decryptionError) {
        iterator.throw!(decryptionError);
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
    params?: DecryptParameters
  ): T {
    // Embedding excluded AAD fields POC v2
    // No additional considerations are made for sync functions, as they are only
    // utilized in migrations, before we have any access to the SO repo
    const decrypters = this.getDecrypters(params?.omitPrimaryEncryptionKey);
    const iterator = this.attributesToDecryptIterator<T>(descriptor, attributes, params);

    let iteratorResult = iterator.next();
    while (!iteratorResult.done) {
      const [attributeValue, encryptionAADs] = iteratorResult.value;

      // We check this inside of the iterator to throw only if we do need to decrypt anything.
      let decryptionError =
        decrypters.length === 0
          ? new Error('Decryption is disabled because of missing decryption keys.')
          : undefined;
      const decryptersPerAAD = decrypters.flatMap((decr) =>
        encryptionAADs.map((aad) => [decr, aad] as [Crypto, string])
      );
      for (const [decrypter, encryptionAAD] of decryptersPerAAD) {
        try {
          iteratorResult = iterator.next(decrypter.decryptSync(attributeValue, encryptionAAD));
          decryptionError = undefined;
          break;
        } catch (err) {
          // Remember the error thrown when we tried to decrypt with the primary key.
          if (!decryptionError) {
            decryptionError = err;
          }
        }
      }

      if (decryptionError) {
        iterator.throw!(decryptionError);
      }
    }

    return iteratorResult.value;
  }

  private *attributesToDecryptIterator<T extends Record<string, unknown>>(
    descriptor: SavedObjectDescriptor,
    attributes: T,
    params?: DecryptParameters,
    typeDefinition?: EncryptedSavedObjectAttributesDefinition
  ): Iterator<[string, string[]], T, EncryptOutput> {
    // Embedding excluded AAD fields POC v2
    // Check for a type definition coming in, if there isn't one, it's
    // safe to load the one we registered in this version of the software.
    if (!typeDefinition) {
      typeDefinition = this.typeDefinitions.get(descriptor.type);
      if (typeDefinition === undefined) {
        return attributes;
      }
    }

    const encryptionAADs: string[] = [];
    const decryptedAttributes: Record<string, EncryptOutput> = {};

    for (const attributeName of typeDefinition.attributesToEncrypt) {
      const attributeValue = attributes[attributeName];
      if (attributeValue == null) {
        continue;
      }

      if (typeof attributeValue !== 'string') {
        throw new Error(
          `Encrypted "${attributeName}" attribute should be a string, but found ${typeDetect(
            attributeValue
          )}`
        );
      }

      // Embedding excluded AAD fields POC v2
      // Get the model version if it's there, and make sure the
      // encrypted data string is isolated from the meta data
      const { encryptedData } = this.extractModelVersionFromHeader(attributeValue);

      if (!encryptionAADs.length) {
        if (params?.isTypeBeingConverted) {
          // The object is either pending conversion to a multi-namespace type, or it was just converted. We may need to attempt to decrypt
          // it with several different descriptors depending upon how the migrations are structured, and whether this is a full index
          // migration or a single document migration. Note that the originId is set either when the document is converted _or_ when it is
          // imported with "createNewCopies: false", so we have to try with and without it.
          const decryptDescriptors = params.originId
            ? [{ ...descriptor, id: params.originId }, descriptor]
            : [descriptor];
          for (const decryptDescriptor of decryptDescriptors) {
            encryptionAADs.push(this.getAAD(typeDefinition, decryptDescriptor, attributes));
            if (descriptor.namespace) {
              const { namespace, ...alternateDescriptor } = decryptDescriptor;
              encryptionAADs.push(this.getAAD(typeDefinition, alternateDescriptor, attributes));
            }
          }
        } else {
          encryptionAADs.push(this.getAAD(typeDefinition, descriptor, attributes));
        }
      }

      try {
        decryptedAttributes[attributeName] = (yield [encryptedData, encryptionAADs])!;
      } catch (err) {
        this.options.logger.error(
          `Failed to decrypt "${attributeName}" attribute: ${err.message || err}`
        );

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
      this.options.logger.debug(
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
   * @param excludedAttributesOverride Embedding excluded AAD fields POC. Optional input of attributes to exclude from AAD. Will override the registered attributes.
   */
  private getAAD(
    typeDefinition: EncryptedSavedObjectAttributesDefinition,
    descriptor: SavedObjectDescriptor,
    attributes: Record<string, unknown>
  ): string {
    // Collect all attributes (both keys and values) that should contribute to AAD.
    const attributesAAD: Record<string, unknown> = {};

    for (const [attributeKey, attributeValue] of Object.entries(attributes)) {
      if (!typeDefinition.shouldBeExcludedFromAAD(attributeKey)) {
        attributesAAD[attributeKey] = attributeValue;
      }
    }

    if (Object.keys(attributesAAD).length === 0) {
      this.options.logger.debug(
        `The AAD for saved object "${descriptorToArray(
          descriptor
        )}" does not include any attributes.`
      );
    }

    return stringify([...descriptorToArray(descriptor), attributesAAD]);
  }

  /**
   * Returns list of NodeCrypto instances used for decryption.
   * @param omitPrimaryEncryptionKey Specifies whether returned decrypters shouldn't include primary
   * encryption/decryption crypto.
   */
  private getDecrypters(omitPrimaryEncryptionKey?: boolean) {
    if (omitPrimaryEncryptionKey) {
      if (!this.options.decryptionOnlyCryptos || this.options.decryptionOnlyCryptos.length === 0) {
        throw new Error(
          `"omitPrimaryEncryptionKey" cannot be set when secondary keys aren't configured.`
        );
      }

      return this.options.decryptionOnlyCryptos;
    }

    return [
      ...(this.options.primaryCrypto ? [this.options.primaryCrypto] : []),
      ...(this.options.decryptionOnlyCryptos ?? []),
    ];
  }
}
