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
import { initDeleteSpacesApi } from './delete';

jest.setTimeout(30000);
describe('Spaces Public API', () => {
  const spacesSavedObjects = createSpaces();
  const spaces = spacesSavedObjects.map(s => ({ id: s.id, ...s.attributes }));

  let root: ReturnType<typeof kbnTestServer.createRoot>;

  beforeAll(async () => {
    root = kbnTestServer.createRoot();
    const { http } = await root.setup();
    const router = http.createRouter('/');

    const log = loggingServiceMock.create().get('spaces');

    const legacyAPI = createLegacyAPI({ spaces });

    const savedObjectsRepositoryMock = createMockSavedObjectsRepository(spacesSavedObjects);

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

    initDeleteSpacesApi({
      externalRouter: router,
      getSavedObjects: () => legacyAPI.savedObjects,
      log: loggingServiceMock.create().get('spaces'),
      spacesService,
    });

    await root.start();
  });

  afterAll(async () => await root.shutdown());

  test(`DELETE spaces/{id}' deletes the space`, async () => {
    const response = await kbnTestServer.request.delete(root, '/api/spaces/space/a-space');

    const { status } = response;

    expect(status).toEqual(204);
  });

  test.todo(`returns result of routePreCheckLicense`);

  test('DELETE spaces/{id} throws when deleting a non-existent space', async () => {
    const response = await kbnTestServer.request.delete(root, '/api/spaces/space/not-a-space');

    const { status } = response;

    expect(status).toEqual(404);
  });

  test(`DELETE spaces/{id}' cannot delete reserved spaces`, async () => {
    const response = await kbnTestServer.request.delete(root, '/api/spaces/space/default');

    const { status, body } = response;

    expect(status).toEqual(400);
    expect(body).toEqual({
      statusCode: 400,
      error: 'Bad Request',
      message: 'This Space cannot be deleted because it is reserved.',
    });
  });
});
