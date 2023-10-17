/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeTransformFunctions } from '@kbn/core-saved-objects-base-server-internal';
import type {
  SavedObjectModelUnsafeTransformFn,
  SavedObjectsModelChange,
  SavedObjectsModelUnsafeTransformChange,
  SavedObjectsModelVersion,
} from '@kbn/core-saved-objects-server';

import { mapAttributes } from './utilities';
import { EncryptionError } from './crypto';
import type { EncryptedSavedObjectsService, EncryptedSavedObjectTypeRegistration } from './crypto';

export interface CreateEsoModelVersionFnOpts {
  modelVersion: SavedObjectsModelVersion;
  shouldTransformIfDecryptionFails?: boolean;
  inputType?: EncryptedSavedObjectTypeRegistration;
  outputType?: EncryptedSavedObjectTypeRegistration;
}

// This function is designed to wrap a Model Version implementation of an Encrypted Saved Object (a Saved Object
// who's type is registered with the Encrypted Saved Object Plugin). The purpose of this wrapper is to ensure that
// version changes to the ESO what would require re-encryption (e.g.changes to encrypted fields or fields excluded
// from AAD) are performed correctly. Prior to Model Versions, the CreateEncryptedSavedObjectsMigrationFn handled
// wrapping migration functions for the same purpose.
//
// For Model Versions, 'unsafe_transform' changes are leveraged to implement any changes that require re-encryption.
// This funtion returns a Model Version where the 'unsafe_transform' changes are merged into a single transform where
// the document being transformed is first decrypted via the inputType EncryptedSavedObjectTypeRegistration (or by
// default, the EncryptedSavedObjectTypeRegistration registered with the ESO Plugin), then transformed based on the
// 'unsafe_transform' changes defined in the the input Model Versions, and finally encrypred via the outputType
// EncryptedSavedObjectTypeRegistration (or by default, the EncryptedSavedObjectTypeRegistration registered with the
// ESO Plugin). The implementation for this can be found in getCreateEsoModelVersion below.
export type CreateEsoModelVersionFn = (
  opts: CreateEsoModelVersionFnOpts
) => SavedObjectsModelVersion;

export const getCreateEsoModelVersion =
  (
    encryptedSavedObjectsService: Readonly<EncryptedSavedObjectsService>,
    instantiateServiceWithLegacyType: (
      typeRegistration: EncryptedSavedObjectTypeRegistration
    ) => EncryptedSavedObjectsService
  ): CreateEsoModelVersionFn =>
  ({ modelVersion, shouldTransformIfDecryptionFails, inputType, outputType }) => {
    // If there are no unsafe changes, then there is no reason to create an Encrypted Saved Objects Model Version
    // Throw an error to notify the developer
    const incomingUnsafeChanges = modelVersion.changes.filter(
      (change) => change.type === 'unsafe_transform'
    ) as SavedObjectsModelUnsafeTransformChange[];
    if (incomingUnsafeChanges.length === 0) {
      throw new Error(
        `No unsafe transform changes defined. At least one unsafe transform change is required to create an Encrypted Saved Objects Model Version.`
      );
    }

    if (inputType && outputType && inputType.type !== outputType.type) {
      throw new Error(
        `An invalid Encrypted Saved Objects Model Version transformation is trying to transform across types ("${inputType.type}" => "${outputType.type}"), which isn't permitted`
      );
    }

    const inputService = inputType
      ? instantiateServiceWithLegacyType(inputType)
      : encryptedSavedObjectsService;

    const transformedService = outputType
      ? instantiateServiceWithLegacyType(outputType)
      : encryptedSavedObjectsService;

    const transformFn = createMergedUnsafeTransformFn(
      inputService,
      transformedService,
      shouldTransformIfDecryptionFails,
      incomingUnsafeChanges.map((change) => change.transformFn)
    );

    // ToDo: not sure of what the order should be here. I opted to place the merged unsafe transform at the beginning
    const changes: SavedObjectsModelChange[] = [
      { type: 'unsafe_transform', transformFn },
      ...modelVersion.changes.filter((change) => change.type !== 'unsafe_transform'),
    ];

    return { ...modelVersion, changes };
  };

function createMergedUnsafeTransformFn(
  inputService: Readonly<EncryptedSavedObjectsService>,
  transformedService: Readonly<EncryptedSavedObjectsService>,
  shouldTransformIfDecryptionFails: boolean | undefined,
  unsafeTransforms: SavedObjectModelUnsafeTransformFn[]
): SavedObjectModelUnsafeTransformFn {
  // merge all transforms
  const mergedUnsafeTransform = mergeTransformFunctions(unsafeTransforms);

  return (document, context) => {
    const { type, id, originId } = document;

    const descriptorNamespace = context.namespaceType === 'single' ? document.namespace : undefined;
    const encryptionDescriptor = { id, type, namespace: descriptorNamespace };

    // Note about isTypeBeingConverted: false
    // "Converting to multi-namespace clashes with the ZDT requirement for serverless"
    // See deprecation in packages/core/saved-objects/core-saved-objects-server/src/migration.ts SavedObjectMigrationContext
    const documentToTransform = mapAttributes(document, (inputAttributes) => {
      try {
        return inputService.decryptAttributesSync<any>(encryptionDescriptor, inputAttributes, {
          isTypeBeingConverted: false, // incompatible with model versions/ZDT
          originId,
        });
      } catch (err) {
        if (!shouldTransformIfDecryptionFails || !(err instanceof EncryptionError)) {
          throw err;
        }

        context.log.warn(
          `Decryption failed for encrypted Saved Object "${document.id}" of type "${document.type}" with error: ${err.message}. Encrypted attributes have been stripped from the original document and model version transformation will be applied but this may cause errors later on.`
        );
        return inputService.stripOrDecryptAttributesSync<any>(
          encryptionDescriptor,
          inputAttributes,
          {
            isTypeBeingConverted: false, // incompatible with model versions/ZDT
            originId,
          }
        ).attributes;
      }
    });

    // call merged transforms
    const result = mergedUnsafeTransform(documentToTransform, context);

    // encrypt
    const transformedDoc = mapAttributes(result.document, (transformedAttributes) => {
      return transformedService.encryptAttributesSync<any>(
        encryptionDescriptor,
        transformedAttributes
      );
    });

    // return encrypted doc
    return { ...result, document: transformedDoc };
  };
}
