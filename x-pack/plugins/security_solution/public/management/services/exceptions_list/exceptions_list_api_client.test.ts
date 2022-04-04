/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, HttpSetup } from 'kibana/public';
import { CreateExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { EXCEPTION_LIST_ITEM_URL, EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import { ExceptionsListItemGenerator } from '../../../../common/endpoint/data_generators/exceptions_list_item_generator';
import { ExceptionsListApiClient } from './exceptions_list_api_client';

const getFakeListId: () => string = () => 'FAKE_LIST_ID';
const getFakeListDefinition: () => CreateExceptionListSchema = () => ({
  name: 'FAKE_LIST_NAME',
  namespace_type: 'agnostic',
  description: 'FAKE_LIST_DESCRIPTION',
  list_id: getFakeListId(),
  type: 'endpoint',
});
const getQueryParams = () => ({
  page: 1,
  perPage: 10,
  filter: 'this is a KQL filter',
  sortField: 'id',
  sortOrder: 'asc',
});

describe('Exceptions List Api Client', () => {
  let fakeCoreStart: jest.Mocked<CoreStart>;
  let fakeHttpServices: jest.Mocked<HttpSetup>;
  let getInstance: () => ExceptionsListApiClient;

  // Initialize mocks once as the ExceptionsListApiClient is a singleton
  beforeAll(() => {
    fakeCoreStart = coreMock.createStart({ basePath: '/mock' });
    fakeHttpServices = fakeCoreStart.http as jest.Mocked<HttpSetup>;
  });

  // Clear every function mock on each execution
  beforeEach(() => {
    fakeHttpServices.post.mockClear();
    fakeHttpServices.get.mockClear();
    fakeHttpServices.put.mockClear();
    fakeHttpServices.delete.mockClear();
    getInstance = () =>
      ExceptionsListApiClient.getInstance(
        fakeHttpServices,
        getFakeListId(),
        getFakeListDefinition()
      );
  });

  describe('Wen getting an instance', () => {
    /**
     * ATENTION: Skipping or modifying this test may cause the other test fails because it's creating the initial Singleton instance.
     * If you want to run tests individually, add this one to the execution with the .only method
     */
    it('New instance is created the first time and the create list method is called', () => {
      const exceptionsListApiClientInstance = getInstance();

      expect(fakeHttpServices.post).toHaveBeenCalledTimes(1);
      expect(fakeHttpServices.post).toHaveBeenCalledWith(EXCEPTION_LIST_URL, {
        body: JSON.stringify(getFakeListDefinition()),
      });
      expect(exceptionsListApiClientInstance).toBeDefined();
    });

    it('No new instance is created the second time and the creat list method is not called', () => {
      const exceptionsListApiClientInstance = getInstance();

      expect(fakeHttpServices.post).toHaveBeenCalledTimes(0);
      expect(exceptionsListApiClientInstance).toBeDefined();
    });

    it('Creating three instances from the same listId only creates the list one time', () => {
      const newFakeListId = 'fakeListIdV2';
      const exceptionsListApiClientInstanceV1 = new ExceptionsListApiClient(
        fakeHttpServices,
        newFakeListId,
        getFakeListDefinition()
      );
      const exceptionsListApiClientInstanceV2 = new ExceptionsListApiClient(
        fakeHttpServices,
        newFakeListId,
        getFakeListDefinition()
      );
      const exceptionsListApiClientInstanceV3 = new ExceptionsListApiClient(
        fakeHttpServices,
        newFakeListId,
        getFakeListDefinition()
      );

      expect(fakeHttpServices.post).toHaveBeenCalledTimes(1);
      expect(exceptionsListApiClientInstanceV1).toBeDefined();
      expect(exceptionsListApiClientInstanceV2).toBeDefined();
      expect(exceptionsListApiClientInstanceV3).toBeDefined();
    });

    it('Creating an instance fails because the create list call throws', async () => {
      try {
        fakeHttpServices.post.mockRejectedValueOnce({
          response: {
            status: 500,
          },
        });
        const newFakeListId = 'fakeListIdV3';
        const failedInstance = new ExceptionsListApiClient(
          fakeHttpServices,
          newFakeListId,
          getFakeListDefinition()
        );
        await failedInstance.find(getQueryParams());
      } catch (err) {
        expect(err.response.status).toBe(500);
      }
    });

    it('Creating an instance when list already exists does not throw', async () => {
      fakeHttpServices.post.mockRejectedValueOnce({
        response: {
          status: 409,
        },
      });
      const newFakeListId = 'fakeListIdV4';
      const notFailedInstance = new ExceptionsListApiClient(
        fakeHttpServices,
        newFakeListId,
        getFakeListDefinition()
      );
      await notFailedInstance.find(getQueryParams());
      expect(notFailedInstance).toBeDefined();
    });
  });

  describe('Wen using public methods', () => {
    it('Find method calls http.get with params', async () => {
      const exceptionsListApiClientInstance = getInstance();

      await exceptionsListApiClientInstance.find(getQueryParams());

      expect(fakeHttpServices.get).toHaveBeenCalledTimes(1);
      const expectedQueryParams = getQueryParams();
      expect(fakeHttpServices.get).toHaveBeenCalledWith(`${EXCEPTION_LIST_ITEM_URL}/_find`, {
        query: {
          page: expectedQueryParams.page,
          per_page: expectedQueryParams.perPage,
          filter: expectedQueryParams.filter,
          sort_field: expectedQueryParams.sortField,
          sort_order: expectedQueryParams.sortOrder,
          namespace_type: ['agnostic'],
          list_id: [getFakeListId()],
        },
      });
    });

    it('Get method calls http.get with params', async () => {
      const exceptionsListApiClientInstance = getInstance();
      const fakeItemId = 'fakeId';

      await exceptionsListApiClientInstance.get(fakeItemId);

      expect(fakeHttpServices.get).toHaveBeenCalledTimes(1);
      expect(fakeHttpServices.get).toHaveBeenCalledWith(EXCEPTION_LIST_ITEM_URL, {
        query: {
          item_id: fakeItemId,
          id: undefined,
          namespace_type: 'agnostic',
        },
      });
    });

    it('Create method calls http.post with params', async () => {
      const exceptionsListApiClientInstance = getInstance();

      const exceptionItem = {
        ...new ExceptionsListItemGenerator('seed').generate(),
        list_id: getFakeListId(),
      };
      await exceptionsListApiClientInstance.create(exceptionItem);

      expect(fakeHttpServices.post).toHaveBeenCalledTimes(1);
      expect(fakeHttpServices.post).toHaveBeenCalledWith(EXCEPTION_LIST_ITEM_URL, {
        body: JSON.stringify(exceptionItem),
      });
    });

    it('Throws when create method has wrong listId', async () => {
      const wrongListId = 'wrong';
      const expectedError = new Error(
        `The list id you are using is not valid, expected [${getFakeListId()}] list id but received [${wrongListId}] list id`
      );
      const exceptionsListApiClientInstance = getInstance();

      const exceptionItem = new ExceptionsListItemGenerator('seed').generate();
      try {
        await exceptionsListApiClientInstance.create({ ...exceptionItem, list_id: wrongListId });
      } catch (err) {
        expect(err).toEqual(expectedError);
      }
    });

    it('Update method calls http.put with params', async () => {
      const exceptionsListApiClientInstance = getInstance();

      const exceptionItem = new ExceptionsListItemGenerator('seed').generate();
      await exceptionsListApiClientInstance.update(exceptionItem);

      expect(fakeHttpServices.put).toHaveBeenCalledTimes(1);
      expect(fakeHttpServices.put).toHaveBeenCalledWith(EXCEPTION_LIST_ITEM_URL, {
        body: JSON.stringify(ExceptionsListApiClient.cleanExceptionsBeforeUpdate(exceptionItem)),
      });
    });

    it('Delete method calls http.delete with params', async () => {
      const exceptionsListApiClientInstance = getInstance();
      const fakeItemId = 'fakeId';

      await exceptionsListApiClientInstance.delete(fakeItemId);

      expect(fakeHttpServices.delete).toHaveBeenCalledTimes(1);
      expect(fakeHttpServices.delete).toHaveBeenCalledWith(EXCEPTION_LIST_ITEM_URL, {
        query: {
          item_id: fakeItemId,
          id: undefined,
          namespace_type: 'agnostic',
        },
      });
    });

    it('Summary method calls http.get with params', async () => {
      const exceptionsListApiClientInstance = getInstance();
      const fakeQklFilter = 'KQL filter';

      await exceptionsListApiClientInstance.summary(fakeQklFilter);

      expect(fakeHttpServices.get).toHaveBeenCalledTimes(1);
      expect(fakeHttpServices.get).toHaveBeenCalledWith(`${EXCEPTION_LIST_URL}/summary`, {
        query: {
          filter: fakeQklFilter,
          list_id: getFakeListId(),
          namespace_type: 'agnostic',
        },
      });
    });

    it('hasData method returns true when list has data', async () => {
      fakeHttpServices.get.mockResolvedValue({
        total: 1,
      });

      const exceptionsListApiClientInstance = getInstance();

      await expect(exceptionsListApiClientInstance.hasData()).resolves.toBe(true);

      expect(fakeHttpServices.get).toHaveBeenCalledWith(`${EXCEPTION_LIST_ITEM_URL}/_find`, {
        query: expect.objectContaining({
          page: 1,
          per_page: 1,
        }),
      });
    });

    it('hasData method returns false when list has no data', async () => {
      fakeHttpServices.get.mockResolvedValue({
        total: 0,
      });

      const exceptionsListApiClientInstance = getInstance();

      await expect(exceptionsListApiClientInstance.hasData()).resolves.toBe(false);
    });

    it('return new instance when HttpCore changes', async () => {
      const initialInstance = ExceptionsListApiClient.getInstance(
        fakeHttpServices,
        getFakeListId(),
        getFakeListDefinition()
      );

      fakeCoreStart = coreMock.createStart({ basePath: '/mock' });
      fakeHttpServices = fakeCoreStart.http as jest.Mocked<HttpSetup>;

      const newInstance = ExceptionsListApiClient.getInstance(
        fakeHttpServices,
        getFakeListId(),
        getFakeListDefinition()
      );

      expect(initialInstance).not.toStrictEqual(newInstance);
    });
  });
});
