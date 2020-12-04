/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { of } from 'rxjs';
import type { SavedObject, SavedObjectsClientContract } from 'kibana/server';
import type { SearchStrategyDependencies } from '../../../../../../src/plugins/data/server';
import { savedObjectsClientMock } from '../../../../../../src/core/server/mocks';
import { BACKGROUND_SESSION_TYPE } from '../../saved_objects';
import { BackgroundSessionDependencies, BackgroundSessionService } from './session_service';
import { createRequestHash } from './utils';
import { AuthenticatedUser } from '../../../../security/common/model';

describe('BackgroundSessionService', () => {
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let service: BackgroundSessionService;

  const sessionId = 'd7170a35-7e2c-48d6-8dec-9a056721b489';
  const mockUser1 = {
    username: 'foo',
    authentication_realm: {
      type: 'foo',
      name: 'foo',
    },
  } as AuthenticatedUser;
  const mockUser2 = {
    username: 'bar',
    authentication_realm: {
      type: 'bar',
      name: 'bar',
    },
  } as AuthenticatedUser;
  const mockSavedObject: SavedObject<any> = {
    id: 'd7170a35-7e2c-48d6-8dec-9a056721b489',
    type: BACKGROUND_SESSION_TYPE,
    attributes: {
      realmType: mockUser1.authentication_realm.type,
      realmName: mockUser1.authentication_realm.name,
      username: mockUser1.username,
      name: 'my_name',
      appId: 'my_app_id',
      urlGeneratorId: 'my_url_generator_id',
      idMapping: {},
    },
    references: [],
  };

  beforeEach(() => {
    savedObjectsClient = savedObjectsClientMock.create();
    service = new BackgroundSessionService();
  });

  describe('save', () => {
    it('throws if `name` is not provided', () => {
      expect(() =>
        service.save(mockUser1, sessionId, {}, { savedObjectsClient })
      ).rejects.toMatchInlineSnapshot(`[Error: Name is required]`);
    });

    it('calls saved objects client with the user info', async () => {
      await service.save(
        mockUser1,
        sessionId,
        {
          name: 'my_name',
          appId: 'my_app_id',
          urlGeneratorId: 'my_url_generator_id',
        },
        { savedObjectsClient }
      );

      expect(savedObjectsClient.create).toHaveBeenCalled();
      const [[, attributes]] = savedObjectsClient.create.mock.calls;
      expect(attributes).toHaveProperty('realmType', mockUser1.authentication_realm.type);
      expect(attributes).toHaveProperty('realmName', mockUser1.authentication_realm.name);
      expect(attributes).toHaveProperty('username', mockUser1.username);
    });

    it('works without security', async () => {
      await service.save(
        null,
        sessionId,
        {
          name: 'my_name',
          appId: 'my_app_id',
          urlGeneratorId: 'my_url_generator_id',
        },
        { savedObjectsClient }
      );

      expect(savedObjectsClient.create).toHaveBeenCalled();
      const [[, attributes]] = savedObjectsClient.create.mock.calls;
      expect(attributes).toHaveProperty('realmType', null);
      expect(attributes).toHaveProperty('realmName', null);
      expect(attributes).toHaveProperty('username', null);
    });
  });

  describe('get', () => {
    it('calls saved objects client', async () => {
      savedObjectsClient.get.mockResolvedValue(mockSavedObject);

      const response = await service.get(mockUser1, sessionId, { savedObjectsClient });

      expect(response).toBe(mockSavedObject);
      expect(savedObjectsClient.get).toHaveBeenCalledWith(BACKGROUND_SESSION_TYPE, sessionId);
    });

    it('throws error if user conflicts', () => {
      savedObjectsClient.get.mockResolvedValue(mockSavedObject);

      expect(
        service.get(mockUser2, sessionId, { savedObjectsClient })
      ).rejects.toMatchInlineSnapshot(`[Error: Not Found]`);
    });

    it('works without security', async () => {
      savedObjectsClient.get.mockResolvedValue(mockSavedObject);

      const response = await service.get(null, sessionId, { savedObjectsClient });

      expect(response).toBe(mockSavedObject);
      expect(savedObjectsClient.get).toHaveBeenCalledWith(BACKGROUND_SESSION_TYPE, sessionId);
    });
  });

  describe('find', () => {
    it('calls saved objects client with user filter', async () => {
      const mockFindSavedObject = {
        ...mockSavedObject,
        score: 1,
      };
      const mockResponse = {
        saved_objects: [mockFindSavedObject],
        total: 1,
        per_page: 1,
        page: 0,
      };
      savedObjectsClient.find.mockResolvedValue(mockResponse);

      const options = { page: 0, perPage: 5 };
      const response = await service.find(mockUser1, options, { savedObjectsClient });

      expect(response).toBe(mockResponse);
      const [[findOptions]] = savedObjectsClient.find.mock.calls;
      expect(findOptions).toMatchInlineSnapshot(`
        Object {
          "filter": "background-session.attributes.realmType: foo and background-session.attributes.realmName: foo and background-session.attributes.username: foo",
          "page": 0,
          "perPage": 5,
          "type": "background-session",
        }
      `);
    });

    it('has no filter without security', async () => {
      const mockFindSavedObject = {
        ...mockSavedObject,
        score: 1,
      };
      const mockResponse = {
        saved_objects: [mockFindSavedObject],
        total: 1,
        per_page: 1,
        page: 0,
      };
      savedObjectsClient.find.mockResolvedValue(mockResponse);

      const options = { page: 0, perPage: 5 };
      const response = await service.find(null, options, { savedObjectsClient });

      expect(response).toBe(mockResponse);
      const [[findOptions]] = savedObjectsClient.find.mock.calls;
      expect(findOptions).toMatchInlineSnapshot(`
        Object {
          "filter": "",
          "page": 0,
          "perPage": 5,
          "type": "background-session",
        }
      `);
    });
  });

  describe('update', () => {
    it('update calls saved objects client', async () => {
      const mockUpdateSavedObject = {
        ...mockSavedObject,
        attributes: {},
      };
      savedObjectsClient.get.mockResolvedValue(mockSavedObject);
      savedObjectsClient.update.mockResolvedValue(mockUpdateSavedObject);

      const attributes = { name: 'new_name' };
      const response = await service.update(mockUser1, sessionId, attributes, {
        savedObjectsClient,
      });

      expect(response).toBe(mockUpdateSavedObject);
      expect(savedObjectsClient.update).toHaveBeenCalledWith(
        BACKGROUND_SESSION_TYPE,
        sessionId,
        attributes
      );
    });

    it('throws if user conflicts', () => {
      const mockUpdateSavedObject = {
        ...mockSavedObject,
        attributes: {},
      };
      savedObjectsClient.get.mockResolvedValue(mockSavedObject);
      savedObjectsClient.update.mockResolvedValue(mockUpdateSavedObject);

      const attributes = { name: 'new_name' };
      expect(
        service.update(mockUser2, sessionId, attributes, {
          savedObjectsClient,
        })
      ).rejects.toMatchInlineSnapshot(`[Error: Not Found]`);
    });

    it('works without security', async () => {
      const mockUpdateSavedObject = {
        ...mockSavedObject,
        attributes: {},
      };
      savedObjectsClient.get.mockResolvedValue(mockSavedObject);
      savedObjectsClient.update.mockResolvedValue(mockUpdateSavedObject);

      const attributes = { name: 'new_name' };
      const response = await service.update(null, sessionId, attributes, {
        savedObjectsClient,
      });

      expect(response).toBe(mockUpdateSavedObject);
      expect(savedObjectsClient.update).toHaveBeenCalledWith(
        BACKGROUND_SESSION_TYPE,
        sessionId,
        attributes
      );
    });
  });

  describe('delete', () => {
    it('calls saved objects client', async () => {
      savedObjectsClient.get.mockResolvedValue(mockSavedObject);
      savedObjectsClient.delete.mockResolvedValue({});

      const response = await service.delete(mockUser1, sessionId, { savedObjectsClient });

      expect(response).toEqual({});
      expect(savedObjectsClient.delete).toHaveBeenCalledWith(BACKGROUND_SESSION_TYPE, sessionId);
    });

    it('throws if user conflicts', () => {
      savedObjectsClient.get.mockResolvedValue(mockSavedObject);
      savedObjectsClient.delete.mockResolvedValue({});

      expect(
        service.delete(mockUser2, sessionId, { savedObjectsClient })
      ).rejects.toMatchInlineSnapshot(`[Error: Not Found]`);
    });

    it('works without security', async () => {
      savedObjectsClient.get.mockResolvedValue(mockSavedObject);
      savedObjectsClient.delete.mockResolvedValue({});

      const response = await service.delete(null, sessionId, { savedObjectsClient });

      expect(response).toEqual({});
      expect(savedObjectsClient.delete).toHaveBeenCalledWith(BACKGROUND_SESSION_TYPE, sessionId);
    });
  });

  describe('search', () => {
    const mockSearch = jest.fn().mockReturnValue(of({}));
    const mockStrategy = { search: mockSearch };
    const mockSearchDeps = {} as SearchStrategyDependencies;
    const mockDeps = {} as BackgroundSessionDependencies;

    beforeEach(() => {
      mockSearch.mockClear();
    });

    it('searches using the original request if not restoring', async () => {
      const searchRequest = { params: {} };
      const options = { sessionId, isStored: false, isRestore: false };

      await service
        .search(mockUser1, mockStrategy, searchRequest, options, mockSearchDeps, mockDeps)
        .toPromise();

      expect(mockSearch).toBeCalledWith(searchRequest, options, mockSearchDeps);
    });

    it('searches using the original request if `id` is provided', async () => {
      const searchId = 'FnpFYlBpeXdCUTMyZXhCLTc1TWFKX0EbdDFDTzJzTE1Sck9PVTBIcW1iU05CZzo4MDA0';
      const searchRequest = { id: searchId, params: {} };
      const options = { sessionId, isStored: true, isRestore: true };

      await service
        .search(mockUser1, mockStrategy, searchRequest, options, mockSearchDeps, mockDeps)
        .toPromise();

      expect(mockSearch).toBeCalledWith(searchRequest, options, mockSearchDeps);
    });

    it('searches by looking up an `id` if restoring and `id` is not provided', async () => {
      const searchRequest = { params: {} };
      const options = { sessionId, isStored: true, isRestore: true };
      const spyGetId = jest.spyOn(service, 'getId').mockResolvedValueOnce('my_id');

      await service
        .search(mockUser1, mockStrategy, searchRequest, options, mockSearchDeps, mockDeps)
        .toPromise();

      expect(mockSearch).toBeCalledWith({ ...searchRequest, id: 'my_id' }, options, mockSearchDeps);

      spyGetId.mockRestore();
    });

    it('calls `trackId` once if the response contains an `id` and not restoring', async () => {
      const searchRequest = { params: {} };
      const options = { sessionId, isStored: false, isRestore: false };
      const spyTrackId = jest.spyOn(service, 'trackId').mockResolvedValue();
      mockSearch.mockReturnValueOnce(of({ id: 'my_id' }, { id: 'my_id' }));

      await service
        .search(mockUser1, mockStrategy, searchRequest, options, mockSearchDeps, mockDeps)
        .toPromise();

      expect(spyTrackId).toBeCalledTimes(1);
      expect(spyTrackId).toBeCalledWith(mockUser1, searchRequest, 'my_id', options, {});

      spyTrackId.mockRestore();
    });

    it('does not call `trackId` if restoring', async () => {
      const searchRequest = { params: {} };
      const options = { sessionId, isStored: true, isRestore: true };
      const spyGetId = jest.spyOn(service, 'getId').mockResolvedValueOnce('my_id');
      const spyTrackId = jest.spyOn(service, 'trackId').mockResolvedValue();
      mockSearch.mockReturnValueOnce(of({ id: 'my_id' }));

      await service
        .search(mockUser1, mockStrategy, searchRequest, options, mockSearchDeps, mockDeps)
        .toPromise();

      expect(spyTrackId).not.toBeCalled();

      spyGetId.mockRestore();
      spyTrackId.mockRestore();
    });
  });

  describe('trackId', () => {
    it('stores hash in memory when `isStored` is `false` for when `save` is called', async () => {
      const searchRequest = { params: {} };
      const searchId = 'FnpFYlBpeXdCUTMyZXhCLTc1TWFKX0EbdDFDTzJzTE1Sck9PVTBIcW1iU05CZzo4MDA0';
      const isStored = false;
      const name = 'my saved background search session';
      const appId = 'my_app_id';
      const urlGeneratorId = 'my_url_generator_id';
      const created = '2020-12-04T20:17:26.367Z';
      const expires = '2020-12-11T20:17:26.367Z';

      await service.trackId(
        mockUser1,
        searchRequest,
        searchId,
        { sessionId, isStored },
        { savedObjectsClient }
      );

      expect(savedObjectsClient.update).not.toHaveBeenCalled();

      await service.save(
        mockUser1,
        sessionId,
        { name, created, expires, appId, urlGeneratorId },
        { savedObjectsClient }
      );

      expect(savedObjectsClient.create.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "background-session",
          Object {
            "appId": "my_app_id",
            "created": "2020-12-04T20:17:26.367Z",
            "expires": "2020-12-11T20:17:26.367Z",
            "idMapping": Object {
              "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a": "FnpFYlBpeXdCUTMyZXhCLTc1TWFKX0EbdDFDTzJzTE1Sck9PVTBIcW1iU05CZzo4MDA0",
            },
            "initialState": Object {},
            "name": "my saved background search session",
            "realmName": "foo",
            "realmType": "foo",
            "restoreState": Object {},
            "status": "in_progress",
            "urlGeneratorId": "my_url_generator_id",
            "username": "foo",
          },
          Object {
            "id": "d7170a35-7e2c-48d6-8dec-9a056721b489",
          },
        ]
      `);
    });

    it('updates saved object when `isStored` is `true`', async () => {
      const searchRequest = { params: {} };
      const searchId = 'FnpFYlBpeXdCUTMyZXhCLTc1TWFKX0EbdDFDTzJzTE1Sck9PVTBIcW1iU05CZzo4MDA0';
      const isStored = true;

      savedObjectsClient.get.mockResolvedValue(mockSavedObject);

      await service.trackId(
        mockUser1,
        searchRequest,
        searchId,
        { sessionId, isStored },
        { savedObjectsClient }
      );

      expect(savedObjectsClient.update.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "background-session",
          "d7170a35-7e2c-48d6-8dec-9a056721b489",
          Object {
            "idMapping": Object {
              "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a": "FnpFYlBpeXdCUTMyZXhCLTc1TWFKX0EbdDFDTzJzTE1Sck9PVTBIcW1iU05CZzo4MDA0",
            },
          },
        ]
      `);
    });
  });

  describe('getId', () => {
    it('throws if `sessionId` is not provided', () => {
      const searchRequest = { params: {} };

      expect(() =>
        service.getId(mockUser1, searchRequest, {}, { savedObjectsClient })
      ).rejects.toMatchInlineSnapshot(`[Error: Session ID is required]`);
    });

    it('throws if there is not a saved object', () => {
      const searchRequest = { params: {} };

      expect(() =>
        service.getId(
          mockUser1,
          searchRequest,
          { sessionId, isStored: false },
          { savedObjectsClient }
        )
      ).rejects.toMatchInlineSnapshot(
        `[Error: Cannot get search ID from a session that is not stored]`
      );
    });

    it('throws if not restoring a saved session', () => {
      const searchRequest = { params: {} };

      expect(() =>
        service.getId(
          mockUser1,
          searchRequest,
          { sessionId, isStored: true, isRestore: false },
          { savedObjectsClient }
        )
      ).rejects.toMatchInlineSnapshot(
        `[Error: Get search ID is only supported when restoring a session]`
      );
    });

    it('returns the search ID from the saved object ID mapping', async () => {
      const searchRequest = { params: {} };
      const requestHash = createRequestHash(searchRequest.params);
      const searchId = 'FnpFYlBpeXdCUTMyZXhCLTc1TWFKX0EbdDFDTzJzTE1Sck9PVTBIcW1iU05CZzo4MDA0';
      const mockSession = {
        ...mockSavedObject,
        attributes: {
          ...mockSavedObject.attributes,
          idMapping: { [requestHash]: searchId },
        },
      };
      savedObjectsClient.get.mockResolvedValue(mockSession);

      const id = await service.getId(
        mockUser1,
        searchRequest,
        { sessionId, isStored: true, isRestore: true },
        { savedObjectsClient }
      );

      expect(id).toBe(searchId);
    });
  });
});
