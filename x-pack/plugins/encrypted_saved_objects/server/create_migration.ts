/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semver from 'semver';

import type {
  SavedObjectMigrationContext,
  SavedObjectMigrationFn,
  SavedObjectUnsanitizedDoc,
} from 'src/core/server';

import type { EncryptedSavedObjectsService, EncryptedSavedObjectTypeRegistration } from './crypto';
import { normalizeNamespace } from './saved_objects';

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

    // After it is converted, the object's old ID is stored in the `originId` field. In addition, objects that are imported a certain way
    // may have this field set, but it would not be necessary to use this to decrypt saved object attributes.
    const { type, id, originId } = encryptedDoc;

    // If an object is slated to be converted, it should be decrypted flexibly:
    // * If this is an index migration:
    //   a. If there is one or more pending migration _before_ the conversion, the object will be decrypted and re-encrypted with its
    //      namespace in the descriptor. Then, after the conversion, the object will be decrypted with its namespace and old ID in the
    //      descriptor and re-encrypted with its new ID (without a namespace) in the descriptor.
    //   b. If there are no pending migrations before the conversion, then after the conversion the object will be decrypted with its
    //      namespace and old ID in the descriptor and re-encrypted with its new ID (without a namespace) in the descriptor.
    // * If this is *not* an index migration, then it is a single document migration. In that case, the object will be decrypted and
    //   re-encrypted without a namespace in the descriptor.
    // To account for these different scenarios, when this field is set, the ESO service will attempt several different permutations of
    // the descriptor when decrypting the object.
    const isTypeBeingConverted =
      !!context.convertToMultiNamespaceTypeVersion &&
      semver.lte(context.migrationVersion, context.convertToMultiNamespaceTypeVersion);

    // This approximates the behavior of getDescriptorNamespace(); the intent is that if there is ever a case where a multi-namespace object
    // has the `namespace` field, it will not be encrypted with that field in its descriptor. It would be preferable to rely on
    // getDescriptorNamespace() here, but that requires the SO type registry which can only be retrieved from a promise, and this is not an
    // async function
    const descriptorNamespace = context.isSingleNamespaceType ? encryptedDoc.namespace : undefined;
    let decryptDescriptorNamespace = descriptorNamespace;

    // If an object has been converted right before this migration function is called, it will no longer have a `namespace` field, but it
    // will have a `namespaces` field; in that case, the first/only element in that array should be used as the namespace in the descriptor
    // during decryption.
    if (isTypeBeingConverted) {
      decryptDescriptorNamespace = encryptedDoc.namespaces?.length
        ? normalizeNamespace(encryptedDoc.namespaces[0]) // `namespaces` contains string values, but we need to normalize this to the namespace ID representation
        : encryptedDoc.namespace;
    }

    // These descriptors might have a `namespace` that is undefined. That is expected for multi-namespace and namespace-agnostic types.
    const decryptDescriptor = { id, type, namespace: decryptDescriptorNamespace };
    const encryptDescriptor = { id, type, namespace: descriptorNamespace };

    // decrypt the attributes using the input type definition
    // then migrate the document
    // then encrypt the attributes using the migration type definition
    return mapAttributes(
      migration(
        mapAttributes(encryptedDoc, (inputAttributes) =>
          inputService.decryptAttributesSync<any>(decryptDescriptor, inputAttributes, {
            isTypeBeingConverted,
            originId,
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
