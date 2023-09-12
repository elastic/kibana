/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectUnsanitizedDoc } from '@kbn/core/server';
import { mergeTransformFunctions } from '@kbn/core-saved-objects-base-server-internal';
import type {
  SavedObjectModelUnsafeTransformFn,
  SavedObjectsModelChange,
  SavedObjectsModelUnsafeTransformChange,
  SavedObjectsModelVersion,
} from '@kbn/core-saved-objects-server';

import { EncryptionError } from './crypto';
import type { EncryptedSavedObjectsService, EncryptedSavedObjectTypeRegistration } from './crypto';

export interface CreateEsoModelVersionFnOpts {
  modelVersion: SavedObjectsModelVersion;
  shouldTransformIfDecryptionFails?: boolean;
  inputType?: EncryptedSavedObjectTypeRegistration;
  outputType?: EncryptedSavedObjectTypeRegistration;
}

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
  (opts) => {
    const { modelVersion, shouldTransformIfDecryptionFails, inputType, outputType } = opts;

    // If there are no unsafe changes, then there is nothing for us to do but return the model version
    const incommingUnsafeChanges = modelVersion.changes.filter(
      (change) => change.type === 'unsafe_transform'
    ) as SavedObjectsModelUnsafeTransformChange[];
    if (!incommingUnsafeChanges || incommingUnsafeChanges.length === 0) return modelVersion;

    if (inputType && outputType && inputType.type !== outputType.type) {
      throw new Error(
        `An Invalid Encrypted Saved Objects Model Version Transformation is trying to transform across types ("${inputType.type}" => "${outputType.type}"), which isn't permitted`
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
      incommingUnsafeChanges.map((change) => change.transformFn)
    );

    // ToDo: not sure of what the order should be here. I opted to place the merged unsafe transform at the beginning
    const changes = [
      { type: 'unsafe_transform', transformFn } as SavedObjectsModelUnsafeTransformChange,
    ] as SavedObjectsModelChange[];
    changes.push(...modelVersion.changes.filter((change) => change.type !== 'unsafe_transform'));

    return { ...modelVersion, changes };
  };

function createMergedUnsafeTransformFn(
  inputService: Readonly<EncryptedSavedObjectsService>,
  transformedService: Readonly<EncryptedSavedObjectsService>,
  shouldTransformIfDecryptionFails: boolean | undefined,
  unsafeTransforms: SavedObjectModelUnsafeTransformFn[]
): SavedObjectModelUnsafeTransformFn {
  // merge all transforms
  const mergedUnsafetransform = mergeTransformFunctions(unsafeTransforms);

  return (document, context) => {
    const { type, id, originId } = document;
    const descriptorNamespace = document.namespace ?? undefined;
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
    const result = mergedUnsafetransform(documentToTransform, context);

    // encrypt
    const transformedDoc = mapAttributes(
      /* <MigratedAttributes>*/ result.document,
      (transformedAttributes) => {
        return transformedService.encryptAttributesSync<any>(
          encryptionDescriptor,
          transformedAttributes
        );
      }
    );

    // return encryted doc
    return { document: transformedDoc };
  };
}

function mapAttributes<T>(obj: SavedObjectUnsanitizedDoc<T>, mapper: (attributes: T) => T) {
  return Object.assign(obj, {
    attributes: mapper(obj.attributes),
  });
}
