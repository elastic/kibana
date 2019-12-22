/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  SavedObjectsSchema,
  SavedObjectsLegacyService,
  SavedObjectsClientContract,
  SavedObjectsImportResponse,
  SavedObjectsImportOptions,
  SavedObjectsExportOptions,
} from 'src/core/server';
import { copySavedObjectsToSpacesFactory } from './copy_to_spaces';
import { Readable } from 'stream';

interface SetupOpts {
  objects: Array<{ type: string; id: string; attributes: Record<string, any> }>;
  getSortedObjectsForExportImpl?: (opts: SavedObjectsExportOptions) => Promise<Readable>;
  importSavedObjectsImpl?: (opts: SavedObjectsImportOptions) => Promise<SavedObjectsImportResponse>;
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
    const savedObjectsClient = (null as unknown) as SavedObjectsClientContract;

    const savedObjectsService: SavedObjectsLegacyService = ({
      importExport: {
        objectLimit: 1000,
        getSortedObjectsForExport:
          setupOpts.getSortedObjectsForExportImpl ||
          jest.fn().mockResolvedValue(
            new Readable({
              objectMode: true,
              read() {
                setupOpts.objects.forEach(o => this.push(o));

                this.push(null);
              },
            })
          ),
        importSavedObjects:
          setupOpts.importSavedObjectsImpl ||
          jest.fn().mockImplementation(async (importOpts: SavedObjectsImportOptions) => {
            await expectStreamToContainObjects(importOpts.readStream, setupOpts.objects);
            const response: SavedObjectsImportResponse = {
              success: true,
              successCount: setupOpts.objects.length,
            };

            return Promise.resolve(response);
          }),
      },
      types: ['dashboard', 'visualization', 'globalType'],
      schema: new SavedObjectsSchema({
        globalType: { isNamespaceAgnostic: true },
      }),
    } as unknown) as SavedObjectsLegacyService;

    return {
      savedObjectsClient,
      savedObjectsService,
    };
  };

  it('uses the Saved Objects Service to perform an export followed by a series of imports', async () => {
    const { savedObjectsClient, savedObjectsService } = setup({
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

    const copySavedObjectsToSpaces = copySavedObjectsToSpacesFactory(
      savedObjectsClient,
      savedObjectsService
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

    expect((savedObjectsService.importExport.getSortedObjectsForExport as jest.Mock).mock.calls)
      .toMatchInlineSnapshot(`
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
                        "savedObjectsClient": null,
                        "types": Array [
                          "dashboard",
                          "visualization",
                        ],
                      },
                    ],
                  ]
            `);

    expect((savedObjectsService.importExport.importSavedObjects as jest.Mock).mock.calls)
      .toMatchInlineSnapshot(`
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
            "savedObjectsClient": null,
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
            "savedObjectsClient": null,
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
    const { savedObjectsClient, savedObjectsService } = setup({
      objects,
      importSavedObjectsImpl: async opts => {
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

    const copySavedObjectsToSpaces = copySavedObjectsToSpacesFactory(
      savedObjectsClient,
      savedObjectsService
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
    const { savedObjectsClient, savedObjectsService } = setup({
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
      getSortedObjectsForExportImpl: opts => {
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

    const copySavedObjectsToSpaces = copySavedObjectsToSpacesFactory(
      savedObjectsClient,
      savedObjectsService
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
