/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as Rx from 'rxjs';
import * as kbnTestServer from '../../../../../../../src/test_utils/kbn_server';
import { createSpaces, createLegacyAPI, createMockSavedObjectsRepository } from '../__fixtures__';
import { CoreSetup } from 'src/core/server';
import { loggingServiceMock, elasticsearchServiceMock } from 'src/core/server/mocks';
import { SpacesService } from '../../../spaces_service';
import { createOptionalPlugin } from '../../../../../../legacy/server/lib/optional_plugin';
import { SpacesAuditLogger } from '../../../lib/audit_logger';
import { SpacesClient } from '../../../lib/spaces_client';
import { initCopyToSpacesApi } from './copy_to_space';

jest.setTimeout(30000);
describe('copy to space', () => {
  const spacesSavedObjects = createSpaces();
  const spaces = spacesSavedObjects.map(s => ({ id: s.id, ...s.attributes }));

  let root: ReturnType<typeof kbnTestServer.createRoot>;

  const savedObjectsRepositoryMock = createMockSavedObjectsRepository(spacesSavedObjects);

  const legacyAPI = createLegacyAPI({ spaces });

  beforeAll(async () => {
    root = kbnTestServer.createRoot();
    const { http } = await root.setup();
    const router = http.createRouter('/');

    const log = loggingServiceMock.create().get('spaces');

    const service = new SpacesService(log, () => legacyAPI);
    const spacesService = await service.setup({
      http: (http as unknown) as CoreSetup['http'],
      elasticsearch: elasticsearchServiceMock.createSetupContract(),
      getSecurity: () =>
        createOptionalPlugin({ get: () => null }, 'xpack.security', {}, 'security'),
      getSpacesAuditLogger: () => ({} as SpacesAuditLogger),
      config$: Rx.of({ maxSpaces: 1000 }),
    });

    spacesService.scopedClient = jest.fn((req: any) => {
      return Promise.resolve(
        new SpacesClient(
          null as any,
          () => null,
          null,
          savedObjectsRepositoryMock,
          { maxSpaces: 1000 },
          savedObjectsRepositoryMock,
          req
        )
      );
    });

    initCopyToSpacesApi({
      externalRouter: router,
      getSavedObjects: () => legacyAPI.savedObjects,
      log: loggingServiceMock.create().get('spaces'),
      spacesService,
    });

    await root.start();
  });

  afterAll(async () => await root.shutdown());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/spaces/_copy_saved_objects', () => {
    test.todo(`returns result of routePreCheckLicense`);

    test(`uses a Saved Objects Client instance without the spaces wrapper`, async () => {
      const payload = {
        spaces: ['a-space'],
        objects: [],
      };

      await kbnTestServer.request.post(root, '/api/spaces/_copy_saved_objects').send(payload);

      expect(legacyAPI.savedObjects.getScopedSavedObjectsClient).toHaveBeenCalledWith(
        expect.any(Object),
        {
          excludedWrappers: ['spaces'],
        }
      );
    });

    test(`requires space IDs to be unique`, async () => {
      const payload = {
        spaces: ['a-space', 'a-space'],
        objects: [],
      };

      const response = await kbnTestServer.request
        .post(root, '/api/spaces/_copy_saved_objects')
        .send(payload);

      const { status, body } = response;

      expect(status).toEqual(400);
      expect(body).toMatchInlineSnapshot(`
                              Object {
                                "error": "Bad Request",
                                "message": "[request body.spaces]: duplicate space ids are not allowed",
                                "statusCode": 400,
                              }
                      `);
    });

    test(`requires well-formed space IDS`, async () => {
      const payload = {
        spaces: ['a-space', 'a-space-invalid-!@#$%^&*()'],
        objects: [],
      };

      const response = await kbnTestServer.request
        .post(root, '/api/spaces/_copy_saved_objects')
        .send(payload);

      const { status, body } = response;

      expect(status).toEqual(400);
      expect(body).toMatchInlineSnapshot(`
                              Object {
                                "error": "Bad Request",
                                "message": "[request body.spaces.1]: lower case, a-z, 0-9, \\"_\\", and \\"-\\" are allowed",
                                "statusCode": 400,
                              }
                      `);
    });

    test(`requires objects to be unique`, async () => {
      const payload = {
        spaces: ['a-space'],
        objects: [{ type: 'foo', id: 'bar' }, { type: 'foo', id: 'bar' }],
      };

      const response = await kbnTestServer.request
        .post(root, '/api/spaces/_copy_saved_objects')
        .send(payload);

      const { status, body } = response;

      expect(status).toEqual(400);
      expect(body).toMatchInlineSnapshot(`
        Object {
          "error": "Bad Request",
          "message": "[request body.objects]: duplicate objects are not allowed",
          "statusCode": 400,
        }
      `);
    });

    test('does not allow namespace agnostic types to be copied (via "supportedTypes" property)', async () => {
      const payload = {
        spaces: ['a-space'],
        objects: [{ type: 'globalType', id: 'bar' }, { type: 'visualization', id: 'bar' }],
      };

      const response = await kbnTestServer.request
        .post(root, '/api/spaces/_copy_saved_objects')
        .send(payload);

      const { status } = response;

      expect(status).toEqual(200);
      expect(legacyAPI.savedObjects.importExport.importSavedObjects).toHaveBeenCalledTimes(1);
      const [importCallOptions] = (legacyAPI.savedObjects.importExport
        .importSavedObjects as any).mock.calls[0];

      expect(importCallOptions).toMatchObject({
        namespace: 'a-space',
        supportedTypes: ['visualization', 'dashboard', 'index-pattern'],
      });
    });

    test('copies to multiple spaces', async () => {
      const payload = {
        spaces: ['a-space', 'b-space'],
        objects: [{ type: 'visualization', id: 'bar' }],
      };

      const response = await kbnTestServer.request
        .post(root, '/api/spaces/_copy_saved_objects')
        .send(payload);

      const { status } = response;

      expect(status).toEqual(200);
      expect(legacyAPI.savedObjects.importExport.importSavedObjects).toHaveBeenCalledTimes(2);
      const [firstImportCallOptions] = (legacyAPI.savedObjects.importExport
        .importSavedObjects as any).mock.calls[0];

      expect(firstImportCallOptions).toMatchObject({
        namespace: 'a-space',
      });

      const [secondImportCallOptions] = (legacyAPI.savedObjects.importExport
        .importSavedObjects as any).mock.calls[1];

      expect(secondImportCallOptions).toMatchObject({
        namespace: 'b-space',
      });
    });
  });

  describe('POST /api/spaces/_resolve_copy_saved_objects_errors', () => {
    test.todo(`returns result of routePreCheckLicense`);

    test(`uses a Saved Objects Client instance without the spaces wrapper`, async () => {
      const payload = {
        retries: {
          ['a-space']: [
            {
              type: 'visualization',
              id: 'bar',
              overwrite: true,
            },
          ],
        },
        objects: [{ type: 'visualization', id: 'bar' }],
      };

      await kbnTestServer.request
        .post(root, '/api/spaces/_resolve_copy_saved_objects_errors')
        .send(payload);

      expect(legacyAPI.savedObjects.getScopedSavedObjectsClient).toHaveBeenCalledWith(
        expect.any(Object),
        {
          excludedWrappers: ['spaces'],
        }
      );
    });

    it(`requires objects to be unique`, async () => {
      const payload = {
        retries: {},
        objects: [{ type: 'foo', id: 'bar' }, { type: 'foo', id: 'bar' }],
      };

      const response = await kbnTestServer.request
        .post(root, '/api/spaces/_resolve_copy_saved_objects_errors')
        .send(payload);

      const { status, body } = response;

      expect(status).toEqual(400);
      expect(body).toMatchInlineSnapshot(`
                Object {
                  "error": "Bad Request",
                  "message": "[request body.objects]: duplicate objects are not allowed",
                  "statusCode": 400,
                }
            `);
    });

    test(`requires well-formed space ids`, async () => {
      const payload = {
        retries: {
          ['invalid-space-id!@#$%^&*()']: [
            {
              type: 'foo',
              id: 'bar',
              overwrite: true,
            },
          ],
        },
        objects: [{ type: 'foo', id: 'bar' }],
      };

      const response = await kbnTestServer.request
        .post(root, '/api/spaces/_resolve_copy_saved_objects_errors')
        .send(payload);

      const { status, body } = response;

      expect(status).toEqual(400);
      expect(body).toMatchInlineSnapshot(`
                        Object {
                          "error": "Bad Request",
                          "message": "[request body.retries]: Invalid space id: invalid-space-id!@#$%^&*()",
                          "statusCode": 400,
                        }
                  `);
    });

    test('does not allow namespace agnostic types to be copied (via "supportedTypes" property)', async () => {
      const payload = {
        retries: {
          ['a-space']: [
            {
              type: 'visualization',
              id: 'bar',
              overwrite: true,
            },
            {
              type: 'globalType',
              id: 'bar',
              overwrite: true,
            },
          ],
        },
        objects: [
          {
            type: 'globalType',
            id: 'bar',
          },
          { type: 'visualization', id: 'bar' },
        ],
      };

      const response = await kbnTestServer.request
        .post(root, '/api/spaces/_resolve_copy_saved_objects_errors')
        .send(payload);

      const { status } = response;

      expect(status).toEqual(200);
      expect(legacyAPI.savedObjects.importExport.resolveImportErrors).toHaveBeenCalledTimes(1);
      const [resolveImportErrorsCallOptions] = (legacyAPI.savedObjects.importExport
        .resolveImportErrors as any).mock.calls[0];

      expect(resolveImportErrorsCallOptions).toMatchObject({
        namespace: 'a-space',
        supportedTypes: ['visualization', 'dashboard', 'index-pattern'],
      });
    });

    test('resolves conflicts for multiple spaces', async () => {
      const payload = {
        objects: [{ type: 'visualization', id: 'bar' }],
        retries: {
          ['a-space']: [
            {
              type: 'visualization',
              id: 'bar',
              overwrite: true,
            },
          ],
          ['b-space']: [
            {
              type: 'globalType',
              id: 'bar',
              overwrite: true,
            },
          ],
        },
      };

      const response = await kbnTestServer.request
        .post(root, '/api/spaces/_resolve_copy_saved_objects_errors')
        .send(payload);

      const { status } = response;

      expect(status).toEqual(200);
      expect(legacyAPI.savedObjects.importExport.resolveImportErrors).toHaveBeenCalledTimes(2);
      const [resolveImportErrorsFirstCallOptions] = (legacyAPI.savedObjects.importExport
        .resolveImportErrors as any).mock.calls[0];

      expect(resolveImportErrorsFirstCallOptions).toMatchObject({
        namespace: 'a-space',
        supportedTypes: ['visualization', 'dashboard', 'index-pattern'],
      });

      const [resolveImportErrorsSecondCallOptions] = (legacyAPI.savedObjects.importExport
        .resolveImportErrors as any).mock.calls[1];

      expect(resolveImportErrorsSecondCallOptions).toMatchObject({
        namespace: 'b-space',
        supportedTypes: ['visualization', 'dashboard', 'index-pattern'],
      });
    });
  });
});
