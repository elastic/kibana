/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectUnsanitizedDoc } from 'kibana/server';
import { migrationMocks } from 'src/core/server/mocks';
import { encryptedSavedObjectsServiceMock } from './crypto/index.mock';
import { getCreateMigration } from './create_migration';

afterEach(() => {
  jest.clearAllMocks();
});

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

  const encryptionSavedObjectService = encryptedSavedObjectsServiceMock.create();

  it('throws if the types arent compatible', async () => {
    const migrationCreator = getCreateMigration(encryptionSavedObjectService, () =>
      encryptedSavedObjectsServiceMock.create()
    );
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

  describe('migration of an existing type', () => {
    it('uses the type in the current service for both input and migration types when none are specified', async () => {
      const instantiateServiceWithLegacyType = jest.fn(() =>
        encryptedSavedObjectsServiceMock.create()
      );

      const migrationCreator = getCreateMigration(
        encryptionSavedObjectService,
        instantiateServiceWithLegacyType
      );
      const noopMigration = migrationCreator<InputType, MigrationType>(
        function (doc): doc is SavedObjectUnsanitizedDoc<InputType> {
          return true;
        },
        (doc) => doc
      );

      const attributes = {
        firstAttr: 'first_attr',
      };

      encryptionSavedObjectService.decryptAttributesSync.mockReturnValueOnce(attributes);
      encryptionSavedObjectService.encryptAttributesSync.mockReturnValueOnce(attributes);

      noopMigration(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
          attributes,
        },
        { log }
      );

      expect(encryptionSavedObjectService.decryptAttributesSync).toHaveBeenCalledWith(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
        },
        attributes
      );

      expect(encryptionSavedObjectService.encryptAttributesSync).toHaveBeenCalledWith(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
        },
        attributes
      );
    });
  });

  describe('migration of a single legacy type', () => {
    it('uses the input type as the mirgation type when omitted', async () => {
      const serviceWithLegacyType = encryptedSavedObjectsServiceMock.create();
      const instantiateServiceWithLegacyType = jest.fn(() => serviceWithLegacyType);

      const migrationCreator = getCreateMigration(
        encryptionSavedObjectService,
        instantiateServiceWithLegacyType
      );
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

      serviceWithLegacyType.decryptAttributesSync.mockReturnValueOnce(attributes);
      encryptionSavedObjectService.encryptAttributesSync.mockReturnValueOnce(attributes);

      noopMigration(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
          attributes,
        },
        { log }
      );

      expect(serviceWithLegacyType.decryptAttributesSync).toHaveBeenCalledWith(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
        },
        attributes
      );

      expect(encryptionSavedObjectService.encryptAttributesSync).toHaveBeenCalledWith(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
        },
        attributes
      );
    });
  });

  describe('migration across two legacy types', () => {
    const serviceWithInputLegacyType = encryptedSavedObjectsServiceMock.create();
    const serviceWithMigrationLegacyType = encryptedSavedObjectsServiceMock.create();
    const instantiateServiceWithLegacyType = jest.fn();

    function createMigration() {
      instantiateServiceWithLegacyType
        .mockImplementationOnce(() => serviceWithInputLegacyType)
        .mockImplementationOnce(() => serviceWithMigrationLegacyType);

      const migrationCreator = getCreateMigration(
        encryptionSavedObjectService,
        instantiateServiceWithLegacyType
      );
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
      expect(instantiateServiceWithLegacyType).toHaveBeenCalledWith(inputType);
      expect(instantiateServiceWithLegacyType).toHaveBeenCalledWith(migrationType);

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

      expect(serviceWithInputLegacyType.decryptAttributesSync).not.toHaveBeenCalled();
      expect(serviceWithMigrationLegacyType.encryptAttributesSync).not.toHaveBeenCalled();
    });

    it('decrypt, migrates and reencrypts saved objects that need to be migrated', async () => {
      const migration = createMigration();
      expect(instantiateServiceWithLegacyType).toHaveBeenCalledWith(inputType);
      expect(instantiateServiceWithLegacyType).toHaveBeenCalledWith(migrationType);

      serviceWithInputLegacyType.decryptAttributesSync.mockReturnValueOnce({
        firstAttr: 'first_attr',
        nonEncryptedAttr: 'non encrypted',
      });

      serviceWithMigrationLegacyType.encryptAttributesSync.mockReturnValueOnce({
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

      expect(serviceWithInputLegacyType.decryptAttributesSync).toHaveBeenCalledWith(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
        },
        {
          firstAttr: '#####',
          nonEncryptedAttr: 'non encrypted',
        }
      );

      expect(serviceWithMigrationLegacyType.encryptAttributesSync).toHaveBeenCalledWith(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
        },
        {
          firstAttr: `~~first_attr~~`,
          encryptedAttr: 'non encrypted',
        }
      );
    });
  });
});
