/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectUnsanitizedDoc } from 'kibana/server';
import { migrationMocks } from 'src/core/server/mocks';
import { EncryptedSavedObjectAttributesDefinition } from './crypto/encrypted_saved_object_type_definition';
import { encryptedSavedObjectsMigrationServiceMock } from './crypto/encrypted_saved_objects_migration_service.mocks';
import { getCreateMigration } from './create_migration';

afterEach(() => {
  jest.clearAllMocks();
});

const migrationService = encryptedSavedObjectsMigrationServiceMock.create();

describe('createMigration()', () => {
  const { log } = migrationMocks.createContext();
  const inputType = { type: 'known-type-1', attributesToEncrypt: new Set(['firstAttr']) };
  const migrationType = {
    type: 'known-type-1',
    attributesToEncrypt: new Set(['firstAttr', 'secondAttr']),
  };

  interface InputType {
    firstAttr: string;
    nonEncryptedAttr?: string;
  }
  interface MigrationType {
    firstAttr: string;
    encryptedAttr?: string;
  }

  it('throws if the types arent compatible', async () => {
    const migrationCreator = getCreateMigration(migrationService);
    expect(() =>
      migrationCreator(
        function (doc): doc is SavedObjectUnsanitizedDoc {
          return true;
        },
        (doc) => doc,
        {
          type: 'known-type-1',
          attributesToEncrypt: new Set(),
        },
        {
          type: 'known-type-2',
          attributesToEncrypt: new Set(),
        }
      )
    ).toThrowErrorMatchingInlineSnapshot(
      `"An Invalid Encrypted Saved Objects migration is trying to migrate across types (\\"known-type-1\\" => \\"known-type-2\\"), which isn't permitted"`
    );
  });

  describe('migration of a single type', () => {
    it('uses the input type as th emirgation type when omitted', async () => {
      const migrationCreator = getCreateMigration(migrationService);
      const noopMigration = migrationCreator<InputType, MigrationType>(
        function (doc): doc is SavedObjectUnsanitizedDoc<InputType> {
          return true;
        },
        (doc) => doc,
        inputType
      );

      const attributes = {
        firstAttr: 'first_attr',
      };

      migrationService.decryptAttributes.mockReturnValueOnce(attributes);
      migrationService.encryptAttributes.mockReturnValueOnce(attributes);

      noopMigration(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
          attributes,
        },
        { log }
      );

      expect(migrationService.decryptAttributes).toHaveBeenCalledWith(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
        },
        new EncryptedSavedObjectAttributesDefinition(inputType),
        attributes
      );

      expect(migrationService.encryptAttributes).toHaveBeenCalledWith(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
        },
        new EncryptedSavedObjectAttributesDefinition(inputType),
        attributes
      );
    });
  });

  describe('migration across two types', () => {
    function createMigration() {
      const migrationCreator = getCreateMigration(migrationService);
      return migrationCreator<InputType, MigrationType>(
        function (doc): doc is SavedObjectUnsanitizedDoc<InputType> {
          // migrate doc that have the second field
          return (
            typeof (doc as SavedObjectUnsanitizedDoc<InputType>).attributes.nonEncryptedAttr ===
            'string'
          );
        },
        ({ attributes: { firstAttr, nonEncryptedAttr }, ...doc }) => ({
          attributes: {
            // modify an encrypted field
            firstAttr: `~~${firstAttr}~~`,
            // encrypt a non encrypted field if it's there
            ...(nonEncryptedAttr ? { encryptedAttr: `${nonEncryptedAttr}` } : {}),
          },
          ...doc,
        }),
        inputType,
        migrationType
      );
    }

    it('doesnt decrypt saved objects that dont need to be migrated', async () => {
      const migration = createMigration();

      expect(
        migration(
          {
            id: '123',
            type: 'known-type-1',
            namespace: 'namespace',
            attributes: {
              firstAttr: '#####',
            },
          },
          { log }
        )
      ).toMatchObject({
        id: '123',
        type: 'known-type-1',
        namespace: 'namespace',
        attributes: {
          firstAttr: '#####',
        },
      });

      expect(migrationService.decryptAttributes).not.toHaveBeenCalled();
      expect(migrationService.encryptAttributes).not.toHaveBeenCalled();
    });

    it('decrypt, migrates and reencrypts saved objects that need to be migrated', async () => {
      const migration = createMigration();

      migrationService.decryptAttributes.mockReturnValueOnce({
        firstAttr: 'first_attr',
        nonEncryptedAttr: 'non encrypted',
      });

      migrationService.encryptAttributes.mockReturnValueOnce({
        firstAttr: `#####`,
        encryptedAttr: `#####`,
      });

      expect(
        migration(
          {
            id: '123',
            type: 'known-type-1',
            namespace: 'namespace',
            attributes: {
              firstAttr: '#####',
              nonEncryptedAttr: 'non encrypted',
            },
          },
          { log }
        )
      ).toMatchObject({
        id: '123',
        type: 'known-type-1',
        namespace: 'namespace',
        attributes: {
          firstAttr: '#####',
          encryptedAttr: `#####`,
        },
      });

      expect(migrationService.decryptAttributes).toHaveBeenCalledWith(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
        },
        new EncryptedSavedObjectAttributesDefinition(inputType),
        {
          firstAttr: '#####',
          nonEncryptedAttr: 'non encrypted',
        }
      );

      expect(migrationService.encryptAttributes).toHaveBeenCalledWith(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
        },
        new EncryptedSavedObjectAttributesDefinition(migrationType),
        {
          firstAttr: `~~first_attr~~`,
          encryptedAttr: 'non encrypted',
        }
      );
    });
  });
});
