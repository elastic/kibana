/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as Rx from 'rxjs';
import * as kbnTestServer from '../../../../../../../src/test_utils/kbn_server';
import { createSpaces, createLegacyAPI, createMockSavedObjectsRepository } from '../__fixtures__';
import { initGetSpacesApi } from './get';
import { CoreSetup } from 'src/core/server';
import { loggingServiceMock, elasticsearchServiceMock } from 'src/core/server/mocks';
import { SpacesService } from '../../../spaces_service';
import { createOptionalPlugin } from '../../../../../../legacy/server/lib/optional_plugin';
import { SpacesAuditLogger } from '../../../lib/audit_logger';
import { SpacesClient } from '../../../lib/spaces_client';

jest.setTimeout(30000);
describe('GET spaces', () => {
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

    initGetSpacesApi({
      externalRouter: router,
      getSavedObjects: () => legacyAPI.savedObjects,
      log: loggingServiceMock.create().get('spaces'),
      spacesService,
    });

    await root.start();
  });

  afterAll(async () => await root.shutdown());

  test(`'GET spaces' returns all available spaces`, async () => {
    const response = await kbnTestServer.request.get(root, '/api/spaces/space');

    expect(response.status).toEqual(200);
    expect(response.body).toEqual(spaces);
  });

  test(`'GET spaces' returns all available spaces with the 'any' purpose`, async () => {
    const response = await kbnTestServer.request.get(root, '/api/spaces/space?purpose=any');

    expect(response.status).toEqual(200);
    expect(response.body).toEqual(spaces);
  });

  test(`'GET spaces' returns all available spaces with the 'copySavedObjectsIntoSpace' purpose`, async () => {
    const response = await kbnTestServer.request.get(
      root,
      '/api/spaces/space?purpose=copySavedObjectsIntoSpace'
    );

    expect(response.status).toEqual(200);
    expect(response.body).toEqual(spaces);
  });

  test.todo(`returns result of routePreCheckLicense`);

  test(`'GET spaces/{id}' returns the space with that id`, async () => {
    const response = await kbnTestServer.request.get(root, '/api/spaces/space/default');

    expect(response.status).toEqual(200);
    expect(response.body).toEqual(spaces.find(s => s.id === 'default'));
  });

  test(`'GET spaces/{id}' returns 404 when retrieving a non-existent space`, async () => {
    const response = await kbnTestServer.request.get(root, '/api/spaces/space/not-a-space');

    expect(response.status).toEqual(404);
  });
});
