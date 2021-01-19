/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Readable } from 'stream';
import {
  SavedObjectsImportResponse,
  SavedObjectsImportOptions,
  SavedObjectsImportSuccess,
  SavedObjectsExportByObjectOptions,
} from 'src/core/server';
import {
  coreMock,
  httpServerMock,
  savedObjectsTypeRegistryMock,
  savedObjectsClientMock,
  savedObjectsServiceMock,
} from 'src/core/server/mocks';
import { copySavedObjectsToSpacesFactory } from './copy_to_spaces';

interface SetupOpts {
  objects: Array<{ type: string; id: string; attributes: Record<string, any> }>;
  exportByObjectsImpl?: (opts: SavedObjectsExportByObjectOptions) => Promise<Readable>;
  importSavedObjectsFromStreamImpl?: (
    opts: SavedObjectsImportOptions
  ) => Promise<SavedObjectsImportResponse>;
}

const expectStreamToContainObjects = async (
  stream: Readable,
  expectedObjects: SetupOpts['objects']
) => {
  const objectsToResolve: unknown[] = await new Promise((resolve, reject) => {
    const objects: SetupOpts['objects'] = [];
    stream.on('data', (chunk) => {
      objects.push(chunk);
    });
    stream.on('end', () => resolve(objects));
    stream.on('error', (err) => reject(err));
  });

  // Ensure the Readable stream passed to `resolveImportErrors` contains all of the expected objects.
  // Verifies functionality for `readStreamToCompletion` and `createReadableStreamFromArray`
  expect(objectsToResolve).toEqual(expectedObjects);
};

describe('copySavedObjectsToSpaces', () => {
  const mockExportResults = [
    { type: 'dashboard', id: 'my-dashboard', attributes: {} },
    { type: 'visualization', id: 'my-viz', attributes: {} },
    { type: 'index-pattern', id: 'my-index-pattern', attributes: {} },
    { type: 'globaltype', id: 'my-globaltype', attributes: {} },
  ];

  const setup = (setupOpts: SetupOpts) => {
    const coreStart = coreMock.createStart();

    const savedObjectsClient = savedObjectsClientMock.create();
    const savedObjectsExporter = savedObjectsServiceMock.createExporter();
    const savedObjectsImporter = savedObjectsServiceMock.createImporter();
    const typeRegistry = savedObjectsTypeRegistryMock.create();
    coreStart.savedObjects.getScopedClient.mockReturnValue(savedObjectsClient);
    coreStart.savedObjects.getTypeRegistry.mockReturnValue(typeRegistry);
    coreStart.savedObjects.createExporter.mockReturnValue(savedObjectsExporter);
    coreStart.savedObjects.createImporter.mockReturnValue(savedObjectsImporter);

    typeRegistry.getImportableAndExportableTypes.mockReturnValue([
      // don't need to include all types, just need a positive case (agnostic) and a negative case (non-agnostic)
      {
        name: 'dashboard',
        namespaceType: 'single',
        hidden: false,
        mappings: { properties: {} },
      },
      {
        name: 'globaltype',
        namespaceType: 'agnostic',
        hidden: false,
        mappings: { properties: {} },
      },
    ]);
    typeRegistry.isNamespaceAgnostic.mockImplementation((type: string) =>
      typeRegistry
        .getImportableAndExportableTypes()
        .some((t) => t.name === type && t.namespaceType === 'agnostic')
    );

    savedObjectsExporter.exportByObjects.mockImplementation(async (opts) => {
      return (
        setupOpts.exportByObjectsImpl?.(opts) ??
        new Readable({
          objectMode: true,
          read() {
            setupOpts.objects.forEach((o) => this.push(o));

            this.push(null);
          },
        })
      );
    });

    savedObjectsImporter.import.mockImplementation(async (opts) => {
      const defaultImpl = async () => {
        // namespace-agnostic types should be filtered out before import
        const filteredObjects = setupOpts.objects.filter(({ type }) => type !== 'globaltype');
        await expectStreamToContainObjects(opts.readStream, filteredObjects);
        const response: SavedObjectsImportResponse = {
          success: true,
          successCount: filteredObjects.length,
          successResults: [('Some success(es) occurred!' as unknown) as SavedObjectsImportSuccess],
        };

        return Promise.resolve(response);
      };

      return setupOpts.importSavedObjectsFromStreamImpl?.(opts) ?? defaultImpl();
    });

    return {
      savedObjects: coreStart.savedObjects,
      savedObjectsClient,
      savedObjectsExporter,
      savedObjectsImporter,
      typeRegistry,
    };
  };

  it('uses the Saved Objects Service to perform an export followed by a series of imports', async () => {
    const { savedObjects, savedObjectsExporter, savedObjectsImporter } = setup({
      objects: mockExportResults,
    });

    const request = httpServerMock.createKibanaRequest();

    const copySavedObjectsToSpaces = copySavedObjectsToSpacesFactory(savedObjects, request);

    const namespace = 'sourceSpace';
    const objects = [{ type: 'dashboard', id: 'my-dashboard' }];
    const result = await copySavedObjectsToSpaces(namespace, ['destination1', 'destination2'], {
      includeReferences: true,
      overwrite: true,
      objects,
      createNewCopies: false,
    });

    expect(result).toMatchInlineSnapshot(`
      Object {
        "destination1": Object {
          "errors": undefined,
          "success": true,
          "successCount": 3,
          "successResults": Array [
            "Some success(es) occurred!",
          ],
        },
        "destination2": Object {
          "errors": undefined,
          "success": true,
          "successCount": 3,
          "successResults": Array [
            "Some success(es) occurred!",
          ],
        },
      }
    `);

    expect(savedObjectsExporter.exportByObjects).toHaveBeenCalledWith({
      excludeExportDetails: true,
      includeReferencesDeep: true,
      namespace,
      objects,
    });

    const importOptions = {
      createNewCopies: false,
      overwrite: true,
      readStream: expect.any(Readable),
    };
    expect(savedObjectsImporter.import).toHaveBeenNthCalledWith(1, {
      ...importOptions,
      namespace: 'destination1',
    });
    expect(savedObjectsImporter.import).toHaveBeenNthCalledWith(2, {
      ...importOptions,
      namespace: 'destination2',
    });
  });

  it(`doesn't stop copy if some spaces fail`, async () => {
    const { savedObjects } = setup({
      objects: mockExportResults,
      importSavedObjectsFromStreamImpl: async (opts) => {
        if (opts.namespace === 'failure-space') {
          throw new Error(`Some error occurred!`);
        }
        // namespace-agnostic types should be filtered out before import
        const filteredObjects = mockExportResults.filter(({ type }) => type !== 'globaltype');
        await expectStreamToContainObjects(opts.readStream, filteredObjects);
        return Promise.resolve({
          success: true,
          successCount: filteredObjects.length,
          successResults: [('Some success(es) occurred!' as unknown) as SavedObjectsImportSuccess],
        });
      },
    });

    const request = httpServerMock.createKibanaRequest();

    const copySavedObjectsToSpaces = copySavedObjectsToSpacesFactory(savedObjects, request);

    const result = await copySavedObjectsToSpaces(
      'sourceSpace',
      ['failure-space', 'non-existent-space', 'marketing'],
      {
        includeReferences: true,
        overwrite: true,
        objects: [{ type: 'dashboard', id: 'my-dashboard' }],
        createNewCopies: false,
      }
    );

    expect(result).toMatchInlineSnapshot(`
      Object {
        "failure-space": Object {
          "errors": Array [
            [Error: Some error occurred!],
          ],
          "success": false,
          "successCount": 0,
        },
        "marketing": Object {
          "errors": undefined,
          "success": true,
          "successCount": 3,
          "successResults": Array [
            "Some success(es) occurred!",
          ],
        },
        "non-existent-space": Object {
          "errors": undefined,
          "success": true,
          "successCount": 3,
          "successResults": Array [
            "Some success(es) occurred!",
          ],
        },
      }
    `);
  });

  it(`handles stream read errors`, async () => {
    const { savedObjects } = setup({
      objects: mockExportResults,
      exportByObjectsImpl: (_opts) => {
        return Promise.resolve(
          new Readable({
            objectMode: true,
            read() {
              this.destroy(new Error('Something went wrong while reading this stream'));
            },
          })
        );
      },
    });

    const request = httpServerMock.createKibanaRequest();

    const copySavedObjectsToSpaces = copySavedObjectsToSpacesFactory(savedObjects, request);

    await expect(
      copySavedObjectsToSpaces(
        'sourceSpace',
        ['failure-space', 'non-existent-space', 'marketing'],
        {
          includeReferences: true,
          overwrite: true,
          objects: [{ type: 'dashboard', id: 'my-dashboard' }],
          createNewCopies: false,
        }
      )
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Something went wrong while reading this stream"`
    );
  });
});
