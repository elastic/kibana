/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObjectUnsanitizedDoc,
  SavedObjectMigrationFn,
  SavedObjectMigrationContext,
} from 'src/core/server';
import { EncryptedSavedObjectTypeRegistration, EncryptedSavedObjectsService } from './crypto';

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

    const descriptor = {
      id: encryptedDoc.id!,
      type: encryptedDoc.type,
      namespace: encryptedDoc.namespace,
    };

    // decrypt the attributes using the input type definition
    // then migrate the document
    // then encrypt the attributes using the migration type definition
    return mapAttributes(
      migration(
        mapAttributes(encryptedDoc, (inputAttributes) =>
          inputService.decryptAttributesSync<any>(descriptor, inputAttributes)
        ),
        context
      ),
      (migratedAttributes) =>
        migratedService.encryptAttributesSync<any>(descriptor, migratedAttributes)
    );
  };
};

function mapAttributes<T>(obj: SavedObjectUnsanitizedDoc<T>, mapper: (attributes: T) => T) {
  return Object.assign(obj, {
    attributes: mapper(obj.attributes),
  });
}
