/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectUnsanitizedDoc } from 'src/core/server';
import { migrationMocks } from 'src/core/server/mocks';

import { getCreateMigration } from './create_migration';
import { EncryptionError, EncryptionErrorOperation } from './crypto';
import { encryptedSavedObjectsServiceMock } from './crypto/index.mock';

afterEach(() => {
  jest.clearAllMocks();
});

describe('createMigration()', () => {
  const migrationContext = migrationMocks.createContext();
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
      migrationCreator({
        isMigrationNeededPredicate(doc): doc is SavedObjectUnsanitizedDoc {
          return true;
        },
        migration: (doc) => doc,
        inputType: {
          type: 'known-type-1',
          attributesToEncrypt: new Set(),
        },
        migratedType: {
          type: 'known-type-2',
          attributesToEncrypt: new Set(),
        },
      })
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
      const noopMigration = migrationCreator<InputType, MigrationType>({
        isMigrationNeededPredicate(doc): doc is SavedObjectUnsanitizedDoc<InputType> {
          return true;
        },
        migration: (doc) => doc,
      });

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
        migrationContext
      );

      expect(encryptionSavedObjectService.decryptAttributesSync).toHaveBeenCalledWith(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
        },
        attributes,
        { convertToMultiNamespaceType: false }
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

    it('throws error on decryption failure if shouldMigrateIfDecryptionFails is false', () => {
      const instantiateServiceWithLegacyType = jest.fn(() =>
        encryptedSavedObjectsServiceMock.create()
      );
      const migrationFunc = jest.fn((doc) => doc);

      const migrationCreator = getCreateMigration(
        encryptionSavedObjectService,
        instantiateServiceWithLegacyType
      );
      const noopMigration = migrationCreator<InputType, MigrationType>({
        isMigrationNeededPredicate(doc): doc is SavedObjectUnsanitizedDoc<InputType> {
          return true;
        },
        migration: migrationFunc,
      });

      const attributes = {
        firstAttr: 'first_attr',
      };

      encryptionSavedObjectService.decryptAttributesSync.mockImplementationOnce(() => {
        throw new Error('decryption failed!');
      });

      expect(() => {
        noopMigration(
          {
            id: '123',
            type: 'known-type-1',
            namespace: 'namespace',
            attributes,
          },
          migrationContext
        );
      }).toThrowError(`decryption failed!`);

      expect(encryptionSavedObjectService.decryptAttributesSync).toHaveBeenCalledWith(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
        },
        attributes,
        { convertToMultiNamespaceType: false }
      );

      expect(migrationFunc).not.toHaveBeenCalled();
      expect(encryptionSavedObjectService.encryptAttributesSync).not.toHaveBeenCalled();
    });

    it('throws error on decryption failure if shouldMigrateIfDecryptionFails is true but error is not encryption error', () => {
      const instantiateServiceWithLegacyType = jest.fn(() =>
        encryptedSavedObjectsServiceMock.create()
      );
      const migrationFunc = jest.fn((doc) => doc);

      const migrationCreator = getCreateMigration(
        encryptionSavedObjectService,
        instantiateServiceWithLegacyType
      );
      const noopMigration = migrationCreator<InputType, MigrationType>({
        isMigrationNeededPredicate(doc): doc is SavedObjectUnsanitizedDoc<InputType> {
          return true;
        },
        migration: migrationFunc,
        shouldMigrateIfDecryptionFails: true,
      });

      const attributes = {
        firstAttr: 'first_attr',
      };

      encryptionSavedObjectService.decryptAttributesSync.mockImplementationOnce(() => {
        throw new Error('decryption failed!');
      });

      expect(() => {
        noopMigration(
          {
            id: '123',
            type: 'known-type-1',
            namespace: 'namespace',
            attributes,
          },
          migrationContext
        );
      }).toThrowError(`decryption failed!`);

      expect(encryptionSavedObjectService.decryptAttributesSync).toHaveBeenCalledWith(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
        },
        attributes,
        { convertToMultiNamespaceType: false }
      );

      expect(migrationFunc).not.toHaveBeenCalled();
      expect(encryptionSavedObjectService.encryptAttributesSync).not.toHaveBeenCalled();
    });

    it('runs migration function on decryption failure if shouldMigrateIfDecryptionFails is true and error is encryption error', () => {
      const instantiateServiceWithLegacyType = jest.fn(() =>
        encryptedSavedObjectsServiceMock.create()
      );
      const migrationFunc = jest.fn((doc) => doc);

      const migrationCreator = getCreateMigration(
        encryptionSavedObjectService,
        instantiateServiceWithLegacyType
      );
      const noopMigration = migrationCreator<InputType, MigrationType>({
        isMigrationNeededPredicate(doc): doc is SavedObjectUnsanitizedDoc<InputType> {
          return true;
        },
        migration: migrationFunc,
        shouldMigrateIfDecryptionFails: true,
      });

      const attributes = {
        firstAttr: 'first_attr',
      };

      encryptionSavedObjectService.decryptAttributesSync.mockImplementationOnce(() => {
        throw new EncryptionError(
          `Unable to decrypt attribute "'attribute'"`,
          'attribute',
          EncryptionErrorOperation.Decryption,
          new Error('decryption failed')
        );
      });

      noopMigration(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
          attributes,
        },
        migrationContext
      );

      expect(encryptionSavedObjectService.decryptAttributesSync).toHaveBeenCalledWith(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
        },
        attributes,
        { convertToMultiNamespaceType: false }
      );

      expect(migrationFunc).toHaveBeenCalled();
      expect(encryptionSavedObjectService.encryptAttributesSync).not.toHaveBeenCalled();
    });

    it('throws error on migration failure', () => {
      const instantiateServiceWithLegacyType = jest.fn(() =>
        encryptedSavedObjectsServiceMock.create()
      );
      const migrationFunc = jest.fn((doc) => {
        throw new Error('migration failed!');
      });

      const migrationCreator = getCreateMigration(
        encryptionSavedObjectService,
        instantiateServiceWithLegacyType
      );
      const noopMigration = migrationCreator<InputType, MigrationType>({
        isMigrationNeededPredicate(doc): doc is SavedObjectUnsanitizedDoc<InputType> {
          return true;
        },
        migration: migrationFunc,
      });

      const attributes = {
        firstAttr: 'first_attr',
      };

      encryptionSavedObjectService.decryptAttributesSync.mockReturnValueOnce(attributes);

      expect(() => {
        noopMigration(
          {
            id: '123',
            type: 'known-type-1',
            namespace: 'namespace',
            attributes,
          },
          migrationContext
        );
      }).toThrowError(`migration failed!`);

      expect(encryptionSavedObjectService.decryptAttributesSync).toHaveBeenCalledWith(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
        },
        attributes,
        { convertToMultiNamespaceType: false }
      );

      expect(migrationFunc).toHaveBeenCalled();
      expect(encryptionSavedObjectService.encryptAttributesSync).not.toHaveBeenCalled();
    });

    it('throws error on migration failure even if shouldMigrateIfDecryptionFails is true', () => {
      const instantiateServiceWithLegacyType = jest.fn(() =>
        encryptedSavedObjectsServiceMock.create()
      );
      const migrationFunc = jest.fn((doc) => {
        throw new Error('migration failed!');
      });

      const migrationCreator = getCreateMigration(
        encryptionSavedObjectService,
        instantiateServiceWithLegacyType
      );
      const noopMigration = migrationCreator<InputType, MigrationType>({
        isMigrationNeededPredicate(doc): doc is SavedObjectUnsanitizedDoc<InputType> {
          return true;
        },
        migration: migrationFunc,
        shouldMigrateIfDecryptionFails: true,
      });

      const attributes = {
        firstAttr: 'first_attr',
      };

      encryptionSavedObjectService.decryptAttributesSync.mockReturnValueOnce(attributes);

      expect(() => {
        noopMigration(
          {
            id: '123',
            type: 'known-type-1',
            namespace: 'namespace',
            attributes,
          },
          migrationContext
        );
      }).toThrowError(`migration failed!`);

      expect(encryptionSavedObjectService.decryptAttributesSync).toHaveBeenCalledWith(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
        },
        attributes,
        { convertToMultiNamespaceType: false }
      );

      expect(migrationFunc).toHaveBeenCalled();
      expect(encryptionSavedObjectService.encryptAttributesSync).not.toHaveBeenCalled();
    });

    it('throws error on encryption failure', () => {
      const instantiateServiceWithLegacyType = jest.fn(() =>
        encryptedSavedObjectsServiceMock.create()
      );
      const migrationFunc = jest.fn((doc) => doc);

      const migrationCreator = getCreateMigration(
        encryptionSavedObjectService,
        instantiateServiceWithLegacyType
      );
      const noopMigration = migrationCreator<InputType, MigrationType>({
        isMigrationNeededPredicate(doc): doc is SavedObjectUnsanitizedDoc<InputType> {
          return true;
        },
        migration: migrationFunc,
      });

      const attributes = {
        firstAttr: 'first_attr',
      };

      encryptionSavedObjectService.decryptAttributesSync.mockReturnValueOnce(attributes);
      encryptionSavedObjectService.encryptAttributesSync.mockImplementationOnce(() => {
        throw new Error('encryption failed!');
      });

      expect(() => {
        noopMigration(
          {
            id: '123',
            type: 'known-type-1',
            namespace: 'namespace',
            attributes,
          },
          migrationContext
        );
      }).toThrowError(`encryption failed!`);

      expect(encryptionSavedObjectService.decryptAttributesSync).toHaveBeenCalledWith(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
        },
        attributes,
        { convertToMultiNamespaceType: false }
      );

      expect(migrationFunc).toHaveBeenCalled();
      expect(encryptionSavedObjectService.encryptAttributesSync).toHaveBeenCalledWith(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
        },
        attributes
      );
    });

    it('throws error on encryption failure even if shouldMigrateIfDecryptionFails is true', () => {
      const instantiateServiceWithLegacyType = jest.fn(() =>
        encryptedSavedObjectsServiceMock.create()
      );
      const migrationFunc = jest.fn((doc) => doc);

      const migrationCreator = getCreateMigration(
        encryptionSavedObjectService,
        instantiateServiceWithLegacyType
      );
      const noopMigration = migrationCreator<InputType, MigrationType>({
        isMigrationNeededPredicate(doc): doc is SavedObjectUnsanitizedDoc<InputType> {
          return true;
        },
        migration: migrationFunc,
        shouldMigrateIfDecryptionFails: true,
      });

      const attributes = {
        firstAttr: 'first_attr',
      };

      encryptionSavedObjectService.decryptAttributesSync.mockReturnValueOnce(attributes);
      encryptionSavedObjectService.encryptAttributesSync.mockImplementationOnce(() => {
        throw new Error('encryption failed!');
      });

      expect(() => {
        noopMigration(
          {
            id: '123',
            type: 'known-type-1',
            namespace: 'namespace',
            attributes,
          },
          migrationContext
        );
      }).toThrowError(`encryption failed!`);

      expect(encryptionSavedObjectService.decryptAttributesSync).toHaveBeenCalledWith(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
        },
        attributes,
        { convertToMultiNamespaceType: false }
      );

      expect(migrationFunc).toHaveBeenCalled();
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
    it('uses the input type as the migration type when omitted', async () => {
      const serviceWithLegacyType = encryptedSavedObjectsServiceMock.create();
      const instantiateServiceWithLegacyType = jest.fn(() => serviceWithLegacyType);

      const migrationCreator = getCreateMigration(
        encryptionSavedObjectService,
        instantiateServiceWithLegacyType
      );
      const noopMigration = migrationCreator<InputType, MigrationType>({
        isMigrationNeededPredicate(doc): doc is SavedObjectUnsanitizedDoc<InputType> {
          return true;
        },
        migration: (doc) => doc,
        inputType,
      });

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
        migrationContext
      );

      expect(serviceWithLegacyType.decryptAttributesSync).toHaveBeenCalledWith(
        {
          id: '123',
          type: 'known-type-1',
          namespace: 'namespace',
        },
        attributes,
        { convertToMultiNamespaceType: false }
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

    describe('uses the object `namespaces` field to populate the descriptor when the migration context indicates this type is being converted', () => {
      const doTest = ({
        objectNamespace,
        decryptDescriptorNamespace,
      }: {
        objectNamespace: string | undefined;
        decryptDescriptorNamespace: string | undefined;
      }) => {
        const instantiateServiceWithLegacyType = jest.fn(() =>
          encryptedSavedObjectsServiceMock.create()
        );

        const migrationCreator = getCreateMigration(
          encryptionSavedObjectService,
          instantiateServiceWithLegacyType
        );
        const noopMigration = migrationCreator<InputType, MigrationType>({
          isMigrationNeededPredicate(doc): doc is SavedObjectUnsanitizedDoc<InputType> {
            return true;
          },
          migration: (doc) => doc,
        });

        const attributes = {
          firstAttr: 'first_attr',
        };

        encryptionSavedObjectService.decryptAttributesSync.mockReturnValueOnce(attributes);
        encryptionSavedObjectService.encryptAttributesSync.mockReturnValueOnce(attributes);

        noopMigration(
          {
            id: '123',
            type: 'known-type-1',
            namespaces: objectNamespace ? [objectNamespace] : [],
            attributes,
          },
          migrationMocks.createContext({
            migrationVersion: '8.0.0',
            convertToMultiNamespaceTypeVersion: '8.0.0',
          })
        );

        expect(encryptionSavedObjectService.decryptAttributesSync).toHaveBeenCalledWith(
          {
            id: '123',
            type: 'known-type-1',
            namespace: decryptDescriptorNamespace,
          },
          attributes,
          { convertToMultiNamespaceType: true }
        );

        expect(encryptionSavedObjectService.encryptAttributesSync).toHaveBeenCalledWith(
          {
            id: '123',
            type: 'known-type-1',
          },
          attributes
        );
      };

      it('when namespaces is an empty array', () => {
        doTest({ objectNamespace: undefined, decryptDescriptorNamespace: undefined });
      });

      it('when the first namespace element is "default"', () => {
        doTest({ objectNamespace: 'default', decryptDescriptorNamespace: undefined });
      });

      it('when the first namespace element is another string', () => {
        doTest({ objectNamespace: 'foo', decryptDescriptorNamespace: 'foo' });
      });
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
      return migrationCreator<InputType, MigrationType>({
        isMigrationNeededPredicate(doc): doc is SavedObjectUnsanitizedDoc<InputType> {
          // migrate doc that have the second field
          return (
            typeof (doc as SavedObjectUnsanitizedDoc<InputType>).attributes.nonEncryptedAttr ===
            'string'
          );
        },
        migration: ({ attributes: { firstAttr, nonEncryptedAttr }, ...doc }) => ({
          attributes: {
            // modify an encrypted field
            firstAttr: `~~${firstAttr}~~`,
            // encrypt a non encrypted field if it's there
            ...(nonEncryptedAttr ? { encryptedAttr: `${nonEncryptedAttr}` } : {}),
          },
          ...doc,
        }),
        inputType,
        migratedType: migrationType,
      });
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
          migrationContext
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
          migrationContext
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
        },
        { convertToMultiNamespaceType: false }
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
