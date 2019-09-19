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
import { initPostSpacesApi } from './post';

jest.setTimeout(30000);
describe('Spaces Public API', () => {
  const spacesSavedObjects = createSpaces();
  const spaces = spacesSavedObjects.map(s => ({ id: s.id, ...s.attributes }));

  let root: ReturnType<typeof kbnTestServer.createRoot>;

  const savedObjectsRepositoryMock = createMockSavedObjectsRepository(spacesSavedObjects);

  beforeAll(async () => {
    root = kbnTestServer.createRoot();
    const { http } = await root.setup();
    const router = http.createRouter('/');

    const log = loggingServiceMock.create().get('spaces');

    const legacyAPI = createLegacyAPI({ spaces });

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

    initPostSpacesApi({
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

  test('POST /space should create a new space with the provided ID', async () => {
    const payload = {
      id: 'my-space-id',
      name: 'my new space',
      description: 'with a description',
      disabledFeatures: ['foo'],
    };

    const response = await kbnTestServer.request.post(root, '/api/spaces/space').send(payload);

    const { status } = response;

    expect(status).toEqual(200);
    expect(savedObjectsRepositoryMock.create).toHaveBeenCalledTimes(1);
    expect(savedObjectsRepositoryMock.create).toHaveBeenCalledWith(
      'space',
      { name: 'my new space', description: 'with a description', disabledFeatures: ['foo'] },
      { id: 'my-space-id' }
    );
  });

  test.todo(`returns result of routePreCheckLicense`);

  test('POST /space should not allow a space to be updated', async () => {
    const payload = {
      id: 'a-space',
      name: 'my updated space',
      description: 'with a description',
    };

    const response = await kbnTestServer.request.post(root, '/api/spaces/space').send(payload);

    const { status, body } = response;

    expect(status).toEqual(409);
    expect(body).toEqual({
      error: 'Conflict',
      message: 'space conflict',
      statusCode: 409,
    });
  });

  test('POST /space should not require disabledFeatures to be specified', async () => {
    const payload = {
      id: 'my-space-id',
      name: 'my new space',
      description: 'with a description',
    };

    const response = await kbnTestServer.request.post(root, '/api/spaces/space').send(payload);

    const { status } = response;

    expect(status).toEqual(200);
    expect(savedObjectsRepositoryMock.create).toHaveBeenCalledTimes(1);
    expect(savedObjectsRepositoryMock.create).toHaveBeenCalledWith(
      'space',
      { name: 'my new space', description: 'with a description', disabledFeatures: [] },
      { id: 'my-space-id' }
    );
  });
});
