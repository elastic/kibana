/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObjectUnsanitizedDoc,
  SavedObjectMigrationFn,
  SavedObjectMigrationContext,
} from 'kibana/server';
import { pick } from 'lodash';
import { EncryptedSavedObjectAttributesDefinition } from './crypto/encrypted_saved_object_type_definition';
import { EncryptedSavedObjectTypeRegistration, SavedObjectDescriptor } from './crypto';
import { EncryptedSavedObjectsMigrationService } from './crypto/encrypted_saved_objects_migration_service';

type SavedObjectOptionalMigrationFn<InputAttributes, MigratedAttributes> = (
  doc: SavedObjectUnsanitizedDoc<InputAttributes> | SavedObjectUnsanitizedDoc<InputAttributes>,
  context: SavedObjectMigrationContext
) => SavedObjectUnsanitizedDoc<MigratedAttributes>;

type IsMigrationNeededPredicate<InputAttributes, MigratedAttributes> = (
  encryptedDoc:
    | SavedObjectUnsanitizedDoc<InputAttributes>
    | SavedObjectUnsanitizedDoc<MigratedAttributes>
) => encryptedDoc is SavedObjectUnsanitizedDoc<InputAttributes>;

export type CreateESOMigrationFn = <
  InputAttributes = unknown,
  MigratedAttributes = InputAttributes
>(
  isMigrationNeededPredicate: IsMigrationNeededPredicate<InputAttributes, MigratedAttributes>,
  migration: SavedObjectMigrationFn<InputAttributes, MigratedAttributes>,
  inputType: EncryptedSavedObjectTypeRegistration,
  migratedType?: EncryptedSavedObjectTypeRegistration
) => SavedObjectOptionalMigrationFn<InputAttributes, MigratedAttributes>;

export const getCreateMigration = (
  migrationService: EncryptedSavedObjectsMigrationService
): CreateESOMigrationFn => (
  isMigrationNeededPredicate,
  migration,
  inputType,
  migratedType = inputType
) => {
  if (inputType.type !== migratedType.type) {
    throw new Error(
      `An Invalid Encrypted Saved Objects migration is trying to migrate across types ("${inputType.type}" => "${migratedType.type}"), which isn't permitted`
    );
  }
  const inputTypeDefinition = new EncryptedSavedObjectAttributesDefinition(inputType);
  const migratedTypeDefinition = new EncryptedSavedObjectAttributesDefinition(migratedType);
  return (encryptedDoc, context) => {
    if (isMigrationNeededPredicate(encryptedDoc)) {
      const descriptor = pick<SavedObjectDescriptor, SavedObjectUnsanitizedDoc>(
        encryptedDoc,
        'id',
        'type',
        'namespace'
      );

      // decrypt the attributes using the input type definition
      // then migrate the document
      // then encrypt the attributes using the migration type definition
      return mapAttributes(
        migration(
          mapAttributes(encryptedDoc, (inputAttributes) =>
            migrationService.decryptAttributes<any>(
              descriptor,
              inputTypeDefinition,
              inputAttributes
            )
          ),
          context
        ),
        (migratedAttributes) =>
          migrationService.encryptAttributes<any>(
            descriptor,
            migratedTypeDefinition,
            migratedAttributes
          )
      );
    }
    return encryptedDoc;
  };
};

function mapAttributes<T>(obj: SavedObjectUnsanitizedDoc<T>, mapper: (attributes: T) => T) {
  return Object.assign(obj, {
    attributes: mapper(obj.attributes),
  });
}
