/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  SavedObjectsImportResponse,
  SavedObjectsImportOptions,
  SavedObjectsExportOptions,
} from 'src/core/server';
import { copySavedObjectsToSpacesFactory } from './copy_to_spaces';
import { Readable } from 'stream';
import { coreMock, savedObjectsTypeRegistryMock, httpServerMock } from 'src/core/server/mocks';

jest.mock('../../../../../../src/core/server', () => {
  return {
    exportSavedObjectsToStream: jest.fn(),
    importSavedObjectsFromStream: jest.fn(),
  };
});
import {
  exportSavedObjectsToStream,
  importSavedObjectsFromStream,
} from '../../../../../../src/core/server';

interface SetupOpts {
  objects: Array<{ type: string; id: string; attributes: Record<string, any> }>;
  exportSavedObjectsToStreamImpl?: (opts: SavedObjectsExportOptions) => Promise<Readable>;
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
    stream.on('data', chunk => {
      objects.push(chunk);
    });
    stream.on('end', () => resolve(objects));
    stream.on('error', err => reject(err));
  });

  // Ensure the Readable stream passed to `resolveImportErrors` contains all of the expected objects.
  // Verifies functionality for `readStreamToCompletion` and `createReadableStreamFromArray`
  expect(objectsToResolve).toEqual(expectedObjects);
};

describe('copySavedObjectsToSpaces', () => {
  const setup = (setupOpts: SetupOpts) => {
    const coreStart = coreMock.createStart();

    const typeRegistry = savedObjectsTypeRegistryMock.create();
    typeRegistry.getAllTypes.mockReturnValue([
      {
        name: 'dashboard',
        namespaceType: 'single',
        hidden: false,
        mappings: { properties: {} },
      },
      {
        name: 'visualization',
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
      typeRegistry.getAllTypes().some(t => t.name === type && t.namespaceType === 'agnostic')
    );

    coreStart.savedObjects.getTypeRegistry.mockReturnValue(typeRegistry);

    (exportSavedObjectsToStream as jest.Mock).mockImplementation(
      async (opts: SavedObjectsExportOptions) => {
        return (
          setupOpts.exportSavedObjectsToStreamImpl?.(opts) ??
          new Readable({
            objectMode: true,
            read() {
              setupOpts.objects.forEach(o => this.push(o));

              this.push(null);
            },
          })
        );
      }
    );

    (importSavedObjectsFromStream as jest.Mock).mockImplementation(
      async (opts: SavedObjectsImportOptions) => {
        const defaultImpl = async () => {
          await expectStreamToContainObjects(opts.readStream, setupOpts.objects);
          const response: SavedObjectsImportResponse = {
            success: true,
            successCount: setupOpts.objects.length,
          };

          return Promise.resolve(response);
        };

        return setupOpts.importSavedObjectsFromStreamImpl?.(opts) ?? defaultImpl();
      }
    );

    return {
      savedObjects: coreStart.savedObjects,
    };
  };

  it('uses the Saved Objects Service to perform an export followed by a series of imports', async () => {
    const { savedObjects } = setup({
      objects: [
        {
          type: 'dashboard',
          id: 'my-dashboard',
          attributes: {},
        },
        {
          type: 'visualization',
          id: 'my-viz',
          attributes: {},
        },
        {
          type: 'index-pattern',
          id: 'my-index-pattern',
          attributes: {},
        },
      ],
    });

    const request = httpServerMock.createKibanaRequest();

    const copySavedObjectsToSpaces = copySavedObjectsToSpacesFactory(
      savedObjects,
      () => 1000,
      request
    );

    const result = await copySavedObjectsToSpaces('sourceSpace', ['destination1', 'destination2'], {
      includeReferences: true,
      overwrite: true,
      objects: [
        {
          type: 'dashboard',
          id: 'my-dashboard',
        },
      ],
    });

    expect(result).toMatchInlineSnapshot(`
                                                                        Object {
                                                                          "destination1": Object {
                                                                            "errors": undefined,
                                                                            "success": true,
                                                                            "successCount": 3,
                                                                          },
                                                                          "destination2": Object {
                                                                            "errors": undefined,
                                                                            "success": true,
                                                                            "successCount": 3,
                                                                          },
                                                                        }
                                                `);

    expect((exportSavedObjectsToStream as jest.Mock).mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "excludeExportDetails": true,
            "exportSizeLimit": 1000,
            "includeReferencesDeep": true,
            "namespace": "sourceSpace",
            "objects": Array [
              Object {
                "id": "my-dashboard",
                "type": "dashboard",
              },
            ],
            "savedObjectsClient": Object {
              "addToNamespaces": [MockFunction],
              "bulkCreate": [MockFunction],
              "bulkGet": [MockFunction],
              "bulkUpdate": [MockFunction],
              "create": [MockFunction],
              "delete": [MockFunction],
              "deleteFromNamespaces": [MockFunction],
              "errors": [Function],
              "find": [MockFunction],
              "get": [MockFunction],
              "update": [MockFunction],
            },
          },
        ],
      ]
    `);

    expect((importSavedObjectsFromStream as jest.Mock).mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "namespace": "destination1",
            "objectLimit": 1000,
            "overwrite": true,
            "readStream": Readable {
              "_events": Object {
                "data": [Function],
                "end": [Function],
                "error": [Function],
              },
              "_eventsCount": 3,
              "_maxListeners": undefined,
              "_read": [Function],
              "_readableState": ReadableState {
                "autoDestroy": false,
                "awaitDrain": 0,
                "buffer": BufferList {
                  "head": null,
                  "length": 0,
                  "tail": null,
                },
                "decoder": null,
                "defaultEncoding": "utf8",
                "destroyed": false,
                "emitClose": true,
                "emittedReadable": false,
                "encoding": null,
                "endEmitted": true,
                "ended": true,
                "flowing": true,
                "highWaterMark": 16,
                "length": 0,
                "needReadable": false,
                "objectMode": true,
                "paused": false,
                "pipes": null,
                "pipesCount": 0,
                "readableListening": false,
                "reading": false,
                "readingMore": false,
                "resumeScheduled": false,
                "sync": false,
              },
              "readable": false,
            },
            "savedObjectsClient": Object {
              "addToNamespaces": [MockFunction],
              "bulkCreate": [MockFunction],
              "bulkGet": [MockFunction],
              "bulkUpdate": [MockFunction],
              "create": [MockFunction],
              "delete": [MockFunction],
              "deleteFromNamespaces": [MockFunction],
              "errors": [Function],
              "find": [MockFunction],
              "get": [MockFunction],
              "update": [MockFunction],
            },
            "supportedTypes": Array [
              "dashboard",
              "visualization",
            ],
          },
        ],
        Array [
          Object {
            "namespace": "destination2",
            "objectLimit": 1000,
            "overwrite": true,
            "readStream": Readable {
              "_events": Object {
                "data": [Function],
                "end": [Function],
                "error": [Function],
              },
              "_eventsCount": 3,
              "_maxListeners": undefined,
              "_read": [Function],
              "_readableState": ReadableState {
                "autoDestroy": false,
                "awaitDrain": 0,
                "buffer": BufferList {
                  "head": null,
                  "length": 0,
                  "tail": null,
                },
                "decoder": null,
                "defaultEncoding": "utf8",
                "destroyed": false,
                "emitClose": true,
                "emittedReadable": false,
                "encoding": null,
                "endEmitted": true,
                "ended": true,
                "flowing": true,
                "highWaterMark": 16,
                "length": 0,
                "needReadable": false,
                "objectMode": true,
                "paused": false,
                "pipes": null,
                "pipesCount": 0,
                "readableListening": false,
                "reading": false,
                "readingMore": false,
                "resumeScheduled": false,
                "sync": false,
              },
              "readable": false,
            },
            "savedObjectsClient": Object {
              "addToNamespaces": [MockFunction],
              "bulkCreate": [MockFunction],
              "bulkGet": [MockFunction],
              "bulkUpdate": [MockFunction],
              "create": [MockFunction],
              "delete": [MockFunction],
              "deleteFromNamespaces": [MockFunction],
              "errors": [Function],
              "find": [MockFunction],
              "get": [MockFunction],
              "update": [MockFunction],
            },
            "supportedTypes": Array [
              "dashboard",
              "visualization",
            ],
          },
        ],
      ]
    `);
  });

  it(`doesn't stop copy if some spaces fail`, async () => {
    const objects = [
      {
        type: 'dashboard',
        id: 'my-dashboard',
        attributes: {},
      },
      {
        type: 'visualization',
        id: 'my-viz',
        attributes: {},
      },
      {
        type: 'index-pattern',
        id: 'my-index-pattern',
        attributes: {},
      },
    ];

    const { savedObjects } = setup({
      objects,
      importSavedObjectsFromStreamImpl: async opts => {
        if (opts.namespace === 'failure-space') {
          throw new Error(`Some error occurred!`);
        }
        await expectStreamToContainObjects(opts.readStream, objects);
        return Promise.resolve({
          success: true,
          successCount: 3,
        });
      },
    });

    const request = httpServerMock.createKibanaRequest();

    const copySavedObjectsToSpaces = copySavedObjectsToSpacesFactory(
      savedObjects,
      () => 1000,
      request
    );

    const result = await copySavedObjectsToSpaces(
      'sourceSpace',
      ['failure-space', 'non-existent-space', 'marketing'],
      {
        includeReferences: true,
        overwrite: true,
        objects: [
          {
            type: 'dashboard',
            id: 'my-dashboard',
          },
        ],
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
                          },
                          "non-existent-space": Object {
                            "errors": undefined,
                            "success": true,
                            "successCount": 3,
                          },
                        }
                `);
  });

  it(`handles stream read errors`, async () => {
    const { savedObjects } = setup({
      objects: [
        {
          type: 'dashboard',
          id: 'my-dashboard',
          attributes: {},
        },
        {
          type: 'visualization',
          id: 'my-viz',
          attributes: {},
        },
        {
          type: 'index-pattern',
          id: 'my-index-pattern',
          attributes: {},
        },
      ],
      exportSavedObjectsToStreamImpl: opts => {
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

    const copySavedObjectsToSpaces = copySavedObjectsToSpacesFactory(
      savedObjects,
      () => 1000,
      request
    );

    await expect(
      copySavedObjectsToSpaces(
        'sourceSpace',
        ['failure-space', 'non-existent-space', 'marketing'],
        {
          includeReferences: true,
          overwrite: true,
          objects: [
            {
              type: 'dashboard',
              id: 'my-dashboard',
            },
          ],
        }
      )
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Something went wrong while reading this stream"`
    );
  });
});
