/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectUnsanitizedDoc } from 'src/core/server';
import { migrationMocks } from 'src/core/server/mocks';

import { getCreateMigration } from './create_migration';
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
  });

  describe('migration of a single legacy type', () => {
    it('uses the input type as the migration type when omitted', async () => {
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
        objectNamespaces,
        decryptDescriptorNamespace,
        encryptDescriptorNamespace,
      }: {
        objectNamespace: string | undefined;
        objectNamespaces: string[] | undefined;
        decryptDescriptorNamespace: string | undefined;
        encryptDescriptorNamespace: string | undefined;
      }) => {
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
        const attributes = { firstAttr: 'first_attr' };

        ['7.99.99', '8.0.0'].forEach((migrationVersion, i) => {
          encryptionSavedObjectService.decryptAttributesSync.mockReturnValueOnce(attributes);
          encryptionSavedObjectService.encryptAttributesSync.mockReturnValueOnce(attributes);
          noopMigration(
            {
              id: '123',
              originId: 'some-origin-id',
              type: 'known-type-1',
              namespace: objectNamespace,
              namespaces: objectNamespaces,
              attributes,
            },
            migrationMocks.createContext({
              migrationVersion, // test works with any version <= 8.0.0
              convertToMultiNamespaceTypeVersion: '8.0.0',
            })
          );
          expect(encryptionSavedObjectService.decryptAttributesSync).toHaveBeenNthCalledWith(
            i + 1,
            { id: '123', type: 'known-type-1', namespace: decryptDescriptorNamespace },
            attributes,
            { convertToMultiNamespaceType: true, originId: 'some-origin-id' }
          );
          expect(encryptionSavedObjectService.encryptAttributesSync).toHaveBeenNthCalledWith(
            i + 1,
            { id: '123', type: 'known-type-1', namespace: encryptDescriptorNamespace },
            attributes
          );
        });
      };

      [undefined, 'foo'].forEach((objectNamespace) => {
        // In the test cases below, we test what will happen if an object has both `namespace` and `namespaces` fields. This will not happen
        // in normal operation, as when Kibana converts an object from a single- to a multi-namespace type, it removes the `namespace` field
        // and adds the `namespaces` field. The tests below are for completeness.
        const namespaceDescription = objectNamespace ? 'defined' : undefined;

        it(`when namespaces is undefined and namespace is ${namespaceDescription}`, () => {
          doTest({
            objectNamespace,
            objectNamespaces: undefined,
            decryptDescriptorNamespace: objectNamespace,
            encryptDescriptorNamespace: objectNamespace,
          });
        });

        it(`when namespaces is an empty array and namespace is ${namespaceDescription}`, () => {
          // The `namespaces` field should never be an empty array, but we test for it anyway. In this case, we fall back to attempting to
          // decrypt with the `namespace` field; if that doesn't work, the ESO service will try again without it.
          doTest({
            objectNamespace,
            objectNamespaces: [],
            decryptDescriptorNamespace: objectNamespace,
            encryptDescriptorNamespace: objectNamespace,
          });
        });

        it(`when namespaces is a non-empty array (default space) and namespace is ${namespaceDescription}`, () => {
          doTest({
            objectNamespace,
            objectNamespaces: ['default', 'additional-spaces-are-ignored'],
            decryptDescriptorNamespace: undefined,
            encryptDescriptorNamespace: objectNamespace,
          });
        });

        it(`when namespaces is a non-empty array (custom space) and namespace is ${namespaceDescription}`, () => {
          doTest({
            objectNamespace,
            objectNamespaces: ['custom', 'additional-spaces-are-ignored'],
            decryptDescriptorNamespace: 'custom',
            encryptDescriptorNamespace: objectNamespace,
          });
        });
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
