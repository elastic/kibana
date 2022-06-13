/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';

import type {
  SavedObjectsExportByObjectOptions,
  SavedObjectsImportResponse,
  SavedObjectsImportSuccess,
} from '@kbn/core/server';
import {
  coreMock,
  httpServerMock,
  savedObjectsClientMock,
  savedObjectsServiceMock,
  savedObjectsTypeRegistryMock,
} from '@kbn/core/server/mocks';

import { copySavedObjectsToSpacesFactory } from './copy_to_spaces';

interface SetupOpts {
  objects: Array<{ type: string; id: string; attributes: Record<string, any> }>;
  exportByObjectsImpl?: (opts: SavedObjectsExportByObjectOptions) => Promise<Readable>;
}

const expectStreamToEqualObjects = async (
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
  const FAILURE_SPACE = 'failure-space';
  const mockExportResults = [
    // For this test case, these three objects can be shared to multiple spaces
    { type: 'dashboard', id: 'my-dashboard', namespaces: ['source'], attributes: {} },
    { type: 'visualization', id: 'my-viz', namespaces: ['source', 'destination1'], attributes: {} },
    {
      type: 'index-pattern',
      id: 'my-index-pattern',
      namespaces: ['source', 'destination1', 'destination2'],
      attributes: {},
    },
    // This object is namespace-agnostic and cannot be copied to another space
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
        namespaceType: 'multiple',
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
      if (opts.namespace === FAILURE_SPACE) {
        throw new Error(`Some error occurred!`);
      }

      // expectedObjects will never include globaltype, and each object will have its namespaces field omitted
      let expectedObjects = [
        { type: 'dashboard', id: 'my-dashboard', attributes: {} },
        { type: 'visualization', id: 'my-viz', attributes: {} },
        { type: 'index-pattern', id: 'my-index-pattern', attributes: {} },
      ];

      if (!opts.createNewCopies) {
        // if we are *not* creating new copies of objects, then we check destination spaces so we don't try to copy an object to a space where it already exists
        switch (opts.namespace) {
          case 'destination1':
            expectedObjects = [
              { type: 'dashboard', id: 'my-dashboard', attributes: {} },
              // the visualization and index-pattern are not imported into destination1, they already exist there
            ];
            break;
          case 'destination2':
            expectedObjects = [
              { type: 'dashboard', id: 'my-dashboard', attributes: {} },
              { type: 'visualization', id: 'my-viz', attributes: {} },
              // the index-pattern is not imported into destination2, it already exists there
            ];
            break;
        }
      }

      await expectStreamToEqualObjects(opts.readStream, expectedObjects);
      const response: SavedObjectsImportResponse = {
        success: true,
        successCount: expectedObjects.length,
        successResults: ['Some success(es) occurred!' as unknown as SavedObjectsImportSuccess],
        warnings: [],
      };

      return Promise.resolve(response);
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
          "successCount": 1,
          "successResults": Array [
            "Some success(es) occurred!",
          ],
        },
        "destination2": Object {
          "errors": undefined,
          "success": true,
          "successCount": 2,
          "successResults": Array [
            "Some success(es) occurred!",
          ],
        },
      }
    `);

    expect(savedObjectsExporter.exportByObjects).toHaveBeenCalledWith({
      request: expect.any(Object),
      excludeExportDetails: true,
      includeNamespaces: true,
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

  it('does not skip copying objects to spaces where they already exist if createNewCopies is enabled', async () => {
    const { savedObjects, savedObjectsExporter, savedObjectsImporter } = setup({
      objects: mockExportResults.map(({ namespaces, ...remainingAttrs }) => ({
        ...remainingAttrs, // the objects are exported without the namespaces array
      })),
    });

    const request = httpServerMock.createKibanaRequest();

    const copySavedObjectsToSpaces = copySavedObjectsToSpacesFactory(savedObjects, request);

    const namespace = 'sourceSpace';
    const objects = [{ type: 'dashboard', id: 'my-dashboard' }];
    const result = await copySavedObjectsToSpaces(namespace, ['destination1', 'destination2'], {
      includeReferences: true,
      overwrite: false,
      objects,
      createNewCopies: true,
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
      request: expect.any(Object),
      excludeExportDetails: true,
      includeNamespaces: false,
      includeReferencesDeep: true,
      namespace,
      objects,
    });

    const importOptions = {
      createNewCopies: true,
      overwrite: false,
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
    });

    const request = httpServerMock.createKibanaRequest();

    const copySavedObjectsToSpaces = copySavedObjectsToSpacesFactory(savedObjects, request);

    const result = await copySavedObjectsToSpaces(
      'sourceSpace',
      [FAILURE_SPACE, 'non-existent-space', 'marketing'],
      {
        includeReferences: true,
        overwrite: true,
        objects: [{ type: 'dashboard', id: 'my-dashboard' }],
        createNewCopies: false,
      }
    );
    // See savedObjectsImporter.import mock implementation above; FAILURE_SPACE is a special case that will throw an error

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
