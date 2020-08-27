/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Readable } from 'stream';
import {
  SavedObjectsImportResponse,
  SavedObjectsResolveImportErrorsOptions,
  SavedObjectsExportOptions,
  SavedObjectsImportSuccess,
} from 'src/core/server';
import {
  coreMock,
  httpServerMock,
  savedObjectsTypeRegistryMock,
  savedObjectsClientMock,
} from 'src/core/server/mocks';
import { resolveCopySavedObjectsToSpacesConflictsFactory } from './resolve_copy_conflicts';

jest.mock('../../../../../../src/core/server', () => {
  return {
    exportSavedObjectsToStream: jest.fn(),
    resolveSavedObjectsImportErrors: jest.fn(),
  };
});
import {
  exportSavedObjectsToStream,
  resolveSavedObjectsImportErrors,
} from '../../../../../../src/core/server';

interface SetupOpts {
  objects: Array<{ type: string; id: string; attributes: Record<string, any> }>;
  exportSavedObjectsToStreamImpl?: (opts: SavedObjectsExportOptions) => Promise<Readable>;
  resolveSavedObjectsImportErrorsImpl?: (
    opts: SavedObjectsResolveImportErrorsOptions
  ) => Promise<SavedObjectsImportResponse>;
}

const EXPORT_LIMIT = 1000;

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

describe('resolveCopySavedObjectsToSpacesConflicts', () => {
  const mockExportResults = [
    { type: 'dashboard', id: 'my-dashboard', attributes: {} },
    { type: 'visualization', id: 'my-viz', attributes: {} },
    { type: 'index-pattern', id: 'my-index-pattern', attributes: {} },
  ];

  const setup = (setupOpts: SetupOpts) => {
    const coreStart = coreMock.createStart();

    const savedObjectsClient = savedObjectsClientMock.create();
    const typeRegistry = savedObjectsTypeRegistryMock.create();
    coreStart.savedObjects.getScopedClient.mockReturnValue(savedObjectsClient);
    coreStart.savedObjects.getTypeRegistry.mockReturnValue(typeRegistry);

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

    (exportSavedObjectsToStream as jest.Mock).mockImplementation(
      async (opts: SavedObjectsExportOptions) => {
        return (
          setupOpts.exportSavedObjectsToStreamImpl?.(opts) ??
          new Readable({
            objectMode: true,
            read() {
              setupOpts.objects.forEach((o) => this.push(o));

              this.push(null);
            },
          })
        );
      }
    );

    (resolveSavedObjectsImportErrors as jest.Mock).mockImplementation(
      async (opts: SavedObjectsResolveImportErrorsOptions) => {
        const defaultImpl = async () => {
          // namespace-agnostic types should be filtered out before import
          const filteredObjects = setupOpts.objects.filter(({ type }) => type !== 'globaltype');
          await expectStreamToContainObjects(opts.readStream, filteredObjects);

          const response: SavedObjectsImportResponse = {
            success: true,
            successCount: filteredObjects.length,
            successResults: [
              ('Some success(es) occurred!' as unknown) as SavedObjectsImportSuccess,
            ],
          };

          return response;
        };

        return setupOpts.resolveSavedObjectsImportErrorsImpl?.(opts) ?? defaultImpl();
      }
    );

    return {
      savedObjects: coreStart.savedObjects,
      savedObjectsClient,
      typeRegistry,
    };
  };

  it('uses the Saved Objects Service to perform an export followed by a series of conflict resolution calls', async () => {
    const { savedObjects, savedObjectsClient, typeRegistry } = setup({
      objects: mockExportResults,
    });

    const request = httpServerMock.createKibanaRequest();

    const resolveCopySavedObjectsToSpacesConflicts = resolveCopySavedObjectsToSpacesConflictsFactory(
      savedObjects,
      () => EXPORT_LIMIT,
      request
    );

    const namespace = 'sourceSpace';
    const objects = [{ type: 'dashboard', id: 'my-dashboard' }];
    const retries = {
      destination1: [{ type: 'visualization', id: 'my-visualization', overwrite: true }],
      destination2: [{ type: 'visualization', id: 'my-visualization', overwrite: false }],
    };
    const result = await resolveCopySavedObjectsToSpacesConflicts(namespace, {
      includeReferences: true,
      objects,
      retries,
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

    expect(exportSavedObjectsToStream).toHaveBeenCalledWith({
      excludeExportDetails: true,
      exportSizeLimit: EXPORT_LIMIT,
      includeReferencesDeep: true,
      namespace,
      objects,
      savedObjectsClient,
    });

    const importOptions = {
      createNewCopies: false,
      objectLimit: EXPORT_LIMIT,
      readStream: expect.any(Readable),
      savedObjectsClient,
      typeRegistry,
    };
    expect(resolveSavedObjectsImportErrors).toHaveBeenNthCalledWith(1, {
      ...importOptions,
      namespace: 'destination1',
      retries: [{ ...retries.destination1[0], replaceReferences: [] }],
    });
    expect(resolveSavedObjectsImportErrors).toHaveBeenNthCalledWith(2, {
      ...importOptions,
      namespace: 'destination2',
      retries: [{ ...retries.destination2[0], replaceReferences: [] }],
    });
  });

  it(`doesn't stop resolution if some spaces fail`, async () => {
    const { savedObjects } = setup({
      objects: mockExportResults,
      resolveSavedObjectsImportErrorsImpl: async (opts) => {
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

    const resolveCopySavedObjectsToSpacesConflicts = resolveCopySavedObjectsToSpacesConflictsFactory(
      savedObjects,
      () => EXPORT_LIMIT,
      request
    );

    const result = await resolveCopySavedObjectsToSpacesConflicts('sourceSpace', {
      includeReferences: true,
      objects: [{ type: 'dashboard', id: 'my-dashboard' }],
      retries: {
        ['failure-space']: [{ type: 'visualization', id: 'my-visualization', overwrite: true }],
        ['non-existent-space']: [
          { type: 'visualization', id: 'my-visualization', overwrite: false },
        ],
        marketing: [{ type: 'visualization', id: 'my-visualization', overwrite: true }],
      },
      createNewCopies: false,
    });

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
      objects: [],
      exportSavedObjectsToStreamImpl: (opts) => {
        return Promise.resolve(
          new Readable({
            objectMode: true,
            read() {
              this.emit('error', new Error('Something went wrong while reading this stream'));
            },
          })
        );
      },
    });

    const request = httpServerMock.createKibanaRequest();

    const resolveCopySavedObjectsToSpacesConflicts = resolveCopySavedObjectsToSpacesConflictsFactory(
      savedObjects,
      () => EXPORT_LIMIT,
      request
    );

    await expect(
      resolveCopySavedObjectsToSpacesConflicts('sourceSpace', {
        includeReferences: true,
        objects: [],
        retries: {},
        createNewCopies: false,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Something went wrong while reading this stream"`
    );
  });
});
