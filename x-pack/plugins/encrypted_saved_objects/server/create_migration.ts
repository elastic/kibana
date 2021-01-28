/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectUnsanitizedDoc,
  SavedObjectMigrationFn,
  SavedObjectMigrationContext,
} from 'src/core/server';
import { EncryptedSavedObjectTypeRegistration, EncryptedSavedObjectsService } from './crypto';
import { normalizeNamespace } from './saved_objects/get_descriptor_namespace';

type SavedObjectOptionalMigrationFn<InputAttributes, MigratedAttributes> = (
  doc: SavedObjectUnsanitizedDoc<InputAttributes> | SavedObjectUnsanitizedDoc<MigratedAttributes>,
  context: SavedObjectMigrationContext
) => SavedObjectUnsanitizedDoc<MigratedAttributes>;

type IsMigrationNeededPredicate<InputAttributes, MigratedAttributes> = (
  encryptedDoc:
    | SavedObjectUnsanitizedDoc<InputAttributes>
    | SavedObjectUnsanitizedDoc<MigratedAttributes>
) => encryptedDoc is SavedObjectUnsanitizedDoc<InputAttributes>;

export type CreateEncryptedSavedObjectsMigrationFn = <
  InputAttributes = unknown,
  MigratedAttributes = InputAttributes
>(
  isMigrationNeededPredicate: IsMigrationNeededPredicate<InputAttributes, MigratedAttributes>,
  migration: SavedObjectMigrationFn<InputAttributes, MigratedAttributes>,
  inputType?: EncryptedSavedObjectTypeRegistration,
  migratedType?: EncryptedSavedObjectTypeRegistration
) => SavedObjectOptionalMigrationFn<InputAttributes, MigratedAttributes>;

export const getCreateMigration = (
  encryptedSavedObjectsService: Readonly<EncryptedSavedObjectsService>,
  instantiateServiceWithLegacyType: (
    typeRegistration: EncryptedSavedObjectTypeRegistration
  ) => EncryptedSavedObjectsService
): CreateEncryptedSavedObjectsMigrationFn => (
  isMigrationNeededPredicate,
  migration,
  inputType,
  migratedType
) => {
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

    // decrypt the attributes using the input type definition
    // then migrate the document
    // then encrypt the attributes using the migration type definition
    return mapAttributes(
      migration(
        mapAttributes(encryptedDoc, (inputAttributes) =>
          inputService.decryptAttributesSync<any>(decryptDescriptor, inputAttributes, {
            convertToMultiNamespaceType,
          })
        ),
        context
      ),
      (migratedAttributes) =>
        migratedService.encryptAttributesSync<any>(encryptDescriptor, migratedAttributes)
    );
  };
};

function mapAttributes<T>(obj: SavedObjectUnsanitizedDoc<T>, mapper: (attributes: T) => T) {
  return Object.assign(obj, {
    attributes: mapper(obj.attributes),
  });
}
