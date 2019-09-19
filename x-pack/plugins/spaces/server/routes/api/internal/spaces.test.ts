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
import { initInternalSpacesApi } from './spaces';

jest.setTimeout(30000);
describe('Spaces API', () => {
  const spacesSavedObjects = createSpaces();
  const spaces = spacesSavedObjects.map(s => ({ id: s.id, ...s.attributes }));

  let root: ReturnType<typeof kbnTestServer.createRoot>;

  const legacyAPI = createLegacyAPI({ spaces });

  beforeAll(async () => {
    root = kbnTestServer.createRoot();
    const { http } = await root.setup();
    const router = http.createRouter('/');

    const log = loggingServiceMock.create().get('spaces');

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

    initInternalSpacesApi({
      internalRouter: router,
      getLegacyAPI: () => legacyAPI,
      spacesService,
    });

    await root.start();
  });

  afterAll(async () => await root.shutdown());

  test('POST space/{id}/select should respond with the new space location', async () => {
    const response = await kbnTestServer.request.post(root, '/api/spaces/v1/space/a-space/select');

    const { status, body } = response;
    expect(status).toEqual(200);
    expect(body).toEqual({ location: '/s/a-space/app/kibana' });
  });

  test.todo(`returns result of routePreCheckLicense`);

  test('POST space/{id}/select should respond with 404 when the space is not found', async () => {
    const response = await kbnTestServer.request.post(
      root,
      '/api/spaces/v1/space/not-a-space/select'
    );

    const { status } = response;

    expect(status).toEqual(404);
  });

  test('POST space/{id}/select should respond with the new space location when a server.basePath is in use', async () => {
    legacyAPI.legacyConfig.serverBasePath = '/my/base/path';

    const response = await kbnTestServer.request.post(root, '/api/spaces/v1/space/a-space/select');

    const { status, body } = response;

    expect(status).toEqual(200);

    expect(body).toEqual({ location: '/my/base/path/s/a-space/app/kibana' });
  });
});
