/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { of } from 'rxjs';
import type { SavedObject, SavedObjectsClientContract } from 'kibana/server';
import type { SearchStrategyDependencies } from '../../../../../../src/plugins/data/server';
import { savedObjectsClientMock } from '../../../../../../src/core/server/mocks';
import { BackgroundSessionStatus } from '../../../common';
import { BACKGROUND_SESSION_TYPE } from '../../saved_objects';
import { BackgroundSessionDependencies, BackgroundSessionService } from './session_service';
import { createRequestHash } from './utils';

describe('BackgroundSessionService', () => {
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let service: BackgroundSessionService;

  const sessionId = 'd7170a35-7e2c-48d6-8dec-9a056721b489';
  const mockSavedObject: SavedObject = {
    id: 'd7170a35-7e2c-48d6-8dec-9a056721b489',
    type: BACKGROUND_SESSION_TYPE,
    attributes: {
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

  it('search throws if `name` is not provided', () => {
    expect(() => service.save(sessionId, {}, { savedObjectsClient })).rejects.toMatchInlineSnapshot(
      `[Error: Name is required]`
    );
  });

  it('save throws if `name` is not provided', () => {
    expect(() => service.save(sessionId, {}, { savedObjectsClient })).rejects.toMatchInlineSnapshot(
      `[Error: Name is required]`
    );
  });

  it('get calls saved objects client', async () => {
    savedObjectsClient.get.mockResolvedValue(mockSavedObject);

    const response = await service.get(sessionId, { savedObjectsClient });

    expect(response).toBe(mockSavedObject);
    expect(savedObjectsClient.get).toHaveBeenCalledWith(BACKGROUND_SESSION_TYPE, sessionId);
  });

  it('find calls saved objects client', async () => {
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
    const response = await service.find(options, { savedObjectsClient });

    expect(response).toBe(mockResponse);
    expect(savedObjectsClient.find).toHaveBeenCalledWith({
      ...options,
      type: BACKGROUND_SESSION_TYPE,
    });
  });

  it('update calls saved objects client', async () => {
    const mockUpdateSavedObject = {
      ...mockSavedObject,
      attributes: {},
    };
    savedObjectsClient.update.mockResolvedValue(mockUpdateSavedObject);

    const attributes = { name: 'new_name' };
    const response = await service.update(sessionId, attributes, { savedObjectsClient });

    expect(response).toBe(mockUpdateSavedObject);
    expect(savedObjectsClient.update).toHaveBeenCalledWith(
      BACKGROUND_SESSION_TYPE,
      sessionId,
      attributes
    );
  });

  it('delete calls saved objects client', async () => {
    savedObjectsClient.delete.mockResolvedValue({});

    const response = await service.delete(sessionId, { savedObjectsClient });

    expect(response).toEqual({});
    expect(savedObjectsClient.delete).toHaveBeenCalledWith(BACKGROUND_SESSION_TYPE, sessionId);
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
        .search(mockStrategy, searchRequest, options, mockSearchDeps, mockDeps)
        .toPromise();

      expect(mockSearch).toBeCalledWith(searchRequest, options, mockSearchDeps);
    });

    it('searches using the original request if `id` is provided', async () => {
      const searchId = 'FnpFYlBpeXdCUTMyZXhCLTc1TWFKX0EbdDFDTzJzTE1Sck9PVTBIcW1iU05CZzo4MDA0';
      const searchRequest = { id: searchId, params: {} };
      const options = { sessionId, isStored: true, isRestore: true };

      await service
        .search(mockStrategy, searchRequest, options, mockSearchDeps, mockDeps)
        .toPromise();

      expect(mockSearch).toBeCalledWith(searchRequest, options, mockSearchDeps);
    });

    it('searches by looking up an `id` if restoring and `id` is not provided', async () => {
      const searchRequest = { params: {} };
      const options = { sessionId, isStored: true, isRestore: true };
      const spyGetId = jest.spyOn(service, 'getId').mockResolvedValueOnce('my_id');

      await service
        .search(mockStrategy, searchRequest, options, mockSearchDeps, mockDeps)
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
        .search(mockStrategy, searchRequest, options, mockSearchDeps, mockDeps)
        .toPromise();

      expect(spyTrackId).toBeCalledTimes(1);
      expect(spyTrackId).toBeCalledWith(searchRequest, 'my_id', options, {});

      spyTrackId.mockRestore();
    });

    it('does not call `trackId` if restoring', async () => {
      const searchRequest = { params: {} };
      const options = { sessionId, isStored: true, isRestore: true };
      const spyGetId = jest.spyOn(service, 'getId').mockResolvedValueOnce('my_id');
      const spyTrackId = jest.spyOn(service, 'trackId').mockResolvedValue();
      mockSearch.mockReturnValueOnce(of({ id: 'my_id' }));

      await service
        .search(mockStrategy, searchRequest, options, mockSearchDeps, mockDeps)
        .toPromise();

      expect(spyTrackId).not.toBeCalled();

      spyGetId.mockRestore();
      spyTrackId.mockRestore();
    });
  });

  describe('trackId', () => {
    it('stores hash in memory when `isStored` is `false` for when `save` is called', async () => {
      const searchRequest = { params: {} };
      const requestHash = createRequestHash(searchRequest.params);
      const searchId = 'FnpFYlBpeXdCUTMyZXhCLTc1TWFKX0EbdDFDTzJzTE1Sck9PVTBIcW1iU05CZzo4MDA0';
      const isStored = false;
      const name = 'my saved background search session';
      const appId = 'my_app_id';
      const urlGeneratorId = 'my_url_generator_id';
      const created = new Date().toISOString();
      const expires = new Date().toISOString();

      await service.trackId(
        searchRequest,
        searchId,
        { sessionId, isStored },
        { savedObjectsClient }
      );

      expect(savedObjectsClient.update).not.toHaveBeenCalled();

      await service.save(
        sessionId,
        { name, created, expires, appId, urlGeneratorId },
        { savedObjectsClient }
      );

      expect(savedObjectsClient.create).toHaveBeenCalledWith(
        BACKGROUND_SESSION_TYPE,
        {
          name,
          created,
          expires,
          initialState: {},
          restoreState: {},
          status: BackgroundSessionStatus.IN_PROGRESS,
          idMapping: { [requestHash]: searchId },
          appId,
          urlGeneratorId,
        },
        { id: sessionId }
      );
    });

    it('updates saved object when `isStored` is `true`', async () => {
      const searchRequest = { params: {} };
      const requestHash = createRequestHash(searchRequest.params);
      const searchId = 'FnpFYlBpeXdCUTMyZXhCLTc1TWFKX0EbdDFDTzJzTE1Sck9PVTBIcW1iU05CZzo4MDA0';
      const isStored = true;

      await service.trackId(
        searchRequest,
        searchId,
        { sessionId, isStored },
        { savedObjectsClient }
      );

      expect(savedObjectsClient.update).toHaveBeenCalledWith(BACKGROUND_SESSION_TYPE, sessionId, {
        idMapping: { [requestHash]: searchId },
      });
    });
  });

  describe('getId', () => {
    it('throws if `sessionId` is not provided', () => {
      const searchRequest = { params: {} };

      expect(() =>
        service.getId(searchRequest, {}, { savedObjectsClient })
      ).rejects.toMatchInlineSnapshot(`[Error: Session ID is required]`);
    });

    it('throws if there is not a saved object', () => {
      const searchRequest = { params: {} };

      expect(() =>
        service.getId(searchRequest, { sessionId, isStored: false }, { savedObjectsClient })
      ).rejects.toMatchInlineSnapshot(
        `[Error: Cannot get search ID from a session that is not stored]`
      );
    });

    it('throws if not restoring a saved session', () => {
      const searchRequest = { params: {} };

      expect(() =>
        service.getId(
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
        id: 'd7170a35-7e2c-48d6-8dec-9a056721b489',
        type: BACKGROUND_SESSION_TYPE,
        attributes: {
          name: 'my_name',
          appId: 'my_app_id',
          urlGeneratorId: 'my_url_generator_id',
          idMapping: { [requestHash]: searchId },
        },
        references: [],
      };
      savedObjectsClient.get.mockResolvedValue(mockSession);

      const id = await service.getId(
        searchRequest,
        { sessionId, isStored: true, isRestore: true },
        { savedObjectsClient }
      );

      expect(id).toBe(searchId);
    });
  });
});
