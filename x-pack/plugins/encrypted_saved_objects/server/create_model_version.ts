/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildModelVersionTransformFn } from '@kbn/core-saved-objects-base-server-internal';
import type {
  SavedObjectModelTransformationFn,
  SavedObjectsModelChange,
  SavedObjectsModelVersion,
} from '@kbn/core-saved-objects-server';

import { EncryptionError } from './crypto';
import type { EncryptedSavedObjectsService, EncryptedSavedObjectTypeRegistration } from './crypto';
import { mapAttributes } from './saved_objects/map_attributes';

export interface CreateEsoModelVersionFnOpts {
  modelVersion: SavedObjectsModelVersion;
  shouldTransformIfDecryptionFails?: boolean;
  inputType: EncryptedSavedObjectTypeRegistration;
  outputType: EncryptedSavedObjectTypeRegistration;
}

// This function is designed to wrap a Model Version implementation of an Encrypted Saved Object (a Saved Object
// who's type is registered with the Encrypted Saved Object Plugin). The purpose of this wrapper is to ensure that
// version changes to the ESO what would require re-encryption (e.g.changes to encrypted fields or fields excluded
// from AAD) are performed correctly. Prior to Model Versions, the CreateEncryptedSavedObjectsMigrationFn handled
// wrapping migration functions for the same purpose.
//
// For Model Versions, 'data_backfill', 'data_removal', and 'unsafe_transform' changes are leveraged to implement
// any changes to the object as usual. This function returns a Model Version where the changes are merged into a
// single 'unsafe_transform' transform where the document being transformed is first decrypted via the inputType
// EncryptedSavedObjectTypeRegistration, then transformed based on the changes defined in the input Model Version,
// and finally encrypted via the outputType EncryptedSavedObjectTypeRegistration.The implementation for this can
// be found in getCreateEsoModelVersion below.
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
    // If there are no changes, then there is no reason to create an Encrypted Saved Objects Model Version
    // Throw an error to notify the developer
    const incomingChanges = modelVersion.changes;
    if (incomingChanges.length === 0) {
      throw new Error(
        `No Model Version changes defined. At least one change is required to create an Encrypted Saved Objects Model Version.`
      );
    }

    if (inputType.type !== outputType.type) {
      throw new Error(
        `An invalid Encrypted Saved Objects Model Version transformation is trying to transform across types ("${inputType.type}" => "${outputType.type}"), which isn't permitted`
      );
    }

    const inputService = instantiateServiceWithLegacyType(inputType);
    const outputService =
      inputType !== outputType ? instantiateServiceWithLegacyType(outputType) : inputService;

    const transformFn = createMergedTransformFn(
      inputService,
      outputService,
      shouldTransformIfDecryptionFails,
      incomingChanges
    );

    return { ...modelVersion, changes: [{ type: 'unsafe_transform', transformFn }] };
  };

function createMergedTransformFn(
  inputService: Readonly<EncryptedSavedObjectsService>,
  outputService: Readonly<EncryptedSavedObjectsService>,
  shouldTransformIfDecryptionFails: boolean | undefined,
  modelChanges: SavedObjectsModelChange[]
): SavedObjectModelTransformationFn {
  // This merges the functions from all 'data_backfill', 'data_removal', and 'unsafe_transform' changes
  const mergedTransformFn = buildModelVersionTransformFn(modelChanges);

  return (document, context) => {
    const { type, id, originId } = document;

    const descriptorNamespace = context.namespaceType === 'single' ? document.namespace : undefined;
    const encryptionDescriptor = { id, type, namespace: descriptorNamespace };
    const decryptionParams = {
      // Note about isTypeBeingConverted: false
      // "Converting to multi-namespace clashes with the ZDT requirement for serverless"
      // See deprecation in packages/core/saved-objects/core-saved-objects-server/src/migration.ts SavedObjectMigrationContext
      isTypeBeingConverted: false,
      originId,
    };

    const documentToTransform = mapAttributes(document, (inputAttributes) => {
      try {
        return inputService.decryptAttributesSync<any>(
          encryptionDescriptor,
          inputAttributes,
          decryptionParams
        );
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
          decryptionParams
        ).attributes;
      }
    });

    // call merged transforms
    const result = mergedTransformFn(documentToTransform, context);

    // encrypt
    const transformedDoc = mapAttributes(result.document, (transformedAttributes) => {
      return outputService.encryptAttributesSync<any>(encryptionDescriptor, transformedAttributes);
    });

    // return encrypted doc
    return { ...result, document: transformedDoc };
  };
}
