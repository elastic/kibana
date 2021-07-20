/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectMigrationContext,
  SavedObjectMigrationFn,
  SavedObjectUnsanitizedDoc,
} from 'src/core/server';

import { EncryptionError } from './crypto';
import type { EncryptedSavedObjectsService, EncryptedSavedObjectTypeRegistration } from './crypto';
import { normalizeNamespace } from './saved_objects';

type SavedObjectOptionalMigrationFn<InputAttributes, MigratedAttributes> = (
  doc: SavedObjectUnsanitizedDoc<InputAttributes> | SavedObjectUnsanitizedDoc<MigratedAttributes>,
  context: SavedObjectMigrationContext
) => SavedObjectUnsanitizedDoc<MigratedAttributes>;

export type IsMigrationNeededPredicate<InputAttributes, MigratedAttributes> = (
  encryptedDoc:
    | SavedObjectUnsanitizedDoc<InputAttributes>
    | SavedObjectUnsanitizedDoc<MigratedAttributes>
) => encryptedDoc is SavedObjectUnsanitizedDoc<InputAttributes>;

export interface CreateEncryptedSavedObjectsMigrationFnOpts<
  InputAttributes = unknown,
  MigratedAttributes = InputAttributes
> {
  isMigrationNeededPredicate: IsMigrationNeededPredicate<InputAttributes, MigratedAttributes>;
  migration: SavedObjectMigrationFn<InputAttributes, MigratedAttributes>;
  shouldMigrateIfDecryptionFails?: boolean;
  inputType?: EncryptedSavedObjectTypeRegistration;
  migratedType?: EncryptedSavedObjectTypeRegistration;
}

export type CreateEncryptedSavedObjectsMigrationFn = <
  InputAttributes = unknown,
  MigratedAttributes = InputAttributes
>(
  opts: CreateEncryptedSavedObjectsMigrationFnOpts<InputAttributes, MigratedAttributes>
) => SavedObjectOptionalMigrationFn<InputAttributes, MigratedAttributes>;

export const getCreateMigration = (
  encryptedSavedObjectsService: Readonly<EncryptedSavedObjectsService>,
  instantiateServiceWithLegacyType: (
    typeRegistration: EncryptedSavedObjectTypeRegistration
  ) => EncryptedSavedObjectsService
): CreateEncryptedSavedObjectsMigrationFn => (opts) => {
  const {
    isMigrationNeededPredicate,
    migration,
    shouldMigrateIfDecryptionFails,
    inputType,
    migratedType,
  } = opts;

  if (inputType && migratedType && inputType.type !== migratedType.type) {
    throw new Error(
      `An Invalid Encrypted Saved Objects migration is trying to migrate across types ("${inputType.type}" => "${migratedType.type}"), which isn't permitted`
    );
  }

  const inputService = inputType
    ? instantiateServiceWithLegacyType(inputType)
    : encryptedSavedObjectsService;

  const migratedService = migratedType
    ? instantiateServiceWithLegacyType(migratedType)
    : encryptedSavedObjectsService;

  return (encryptedDoc, context) => {
    if (!isMigrationNeededPredicate(encryptedDoc)) {
      return encryptedDoc;
    }

    // If an object has been converted right before this migration function is called, it will no longer have a `namespace` field, but it
    // will have a `namespaces` field; in that case, the first/only element in that array should be used as the namespace in the descriptor
    // during decryption.
    const convertToMultiNamespaceType =
      context.convertToMultiNamespaceTypeVersion === context.migrationVersion;
    const decryptDescriptorNamespace = convertToMultiNamespaceType
      ? normalizeNamespace(encryptedDoc.namespaces?.[0]) // `namespaces` contains string values, but we need to normalize this to the namespace ID representation
      : encryptedDoc.namespace;

    const { id, type } = encryptedDoc;
    // These descriptors might have a `namespace` that is undefined. That is expected for multi-namespace and namespace-agnostic types.
    const decryptDescriptor = { id, type, namespace: decryptDescriptorNamespace };
    const encryptDescriptor = { id, type, namespace: encryptedDoc.namespace };

    let shouldEncrypt = true;

    // decrypt the attributes using the input type definition
    // if an error occurs during decryption, use the shouldMigrateIfDecryptionFails flag
    // to determine whether to throw the error or return the un-decrypted document for migration
    // if we are migrating the un-decrypted document, set `shouldEncrypt` to false to avoid encrypting
    // an un-decrypted document
    const documentToMigrate = mapAttributes(encryptedDoc, (inputAttributes) => {
      try {
        const decryptedAttributes = inputService.decryptAttributesSync<any>(
          decryptDescriptor,
          inputAttributes,
          { convertToMultiNamespaceType }
        );
        shouldEncrypt = true;
        return decryptedAttributes;
      } catch (err) {
        if (!shouldMigrateIfDecryptionFails || !(err instanceof EncryptionError)) {
          throw err;
        }

        context.log.warn(
          `Decryption failed for encrypted Saved Object "${encryptedDoc.id}" of type "${encryptedDoc.type}" with error: ${err.message}. Migration will be applied to the original encrypted document but this may cause decryption errors later on.`
        );
        shouldEncrypt = false;
        return inputAttributes;
      }
    });

    // migrate the document
    // then if `shouldEncrypt` is true, encrypt the attributes using the migration type definition
    return mapAttributes(migration(documentToMigrate, context), (migratedAttributes) => {
      return shouldEncrypt
        ? migratedService.encryptAttributesSync<any>(encryptDescriptor, migratedAttributes)
        : migratedAttributes;
    });
  };
};

function mapAttributes<T>(obj: SavedObjectUnsanitizedDoc<T>, mapper: (attributes: T) => T) {
  return Object.assign(obj, {
    attributes: mapper(obj.attributes),
  });
}
