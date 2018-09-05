/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SpacesSavedObjectsClient } from './spaces_saved_objects_client';
import { createSpacesService } from '../create_spaces_service';
import { DEFAULT_SPACE_ID } from '../../../common/constants';

const config = {
  'server.basePath': '/'
};

const server = {
  config: () => ({
    get: (key) => {
      return config[key];
    }
  })
};

const createMockRequest = (space) => ({
  getBasePath: () => space.id !== DEFAULT_SPACE_ID ? `/s/${space.id}` : '',
});

const createMockClient = () => {
  const errors = Symbol();

  return {
    get: jest.fn(),
    bulkGet: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    bulkCreate: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    errors,
  };
};

[
  { id: DEFAULT_SPACE_ID, expectedNamespace: undefined },
  { id: 'space_1', expectedNamespace: 'space_1' }
].forEach(currentSpace => {
  describe(`${currentSpace.id} space`, () => {

    describe('#get', () => {
      test(`throws error if options.namespace is specified`, async () => {
        const request = createMockRequest({ id: currentSpace.id });
        const baseClient = createMockClient();
        const spacesService = createSpacesService(server);

        const client = new SpacesSavedObjectsClient({
          request,
          baseClient,
          spacesService,
        });

        await expect(client.get(null, null, { namespace: 'bar' })).rejects.toThrowErrorMatchingSnapshot();
      });

      test(`supplements options with undefined namespace`, async () => {
        const request = createMockRequest({ id: currentSpace.id });
        const baseClient = createMockClient();
        const expectedReturnValue = Symbol();
        baseClient.get.mockReturnValue(expectedReturnValue);
        const spacesService = createSpacesService(server);

        const client = new SpacesSavedObjectsClient({
          request,
          baseClient,
          spacesService,
        });
        const type = Symbol();
        const id = Symbol();
        const options = Object.freeze({ foo: 'bar' });
        const actualReturnValue = await client.get(type, id, options);

        expect(actualReturnValue).toBe(expectedReturnValue);
        expect(baseClient.get).toHaveBeenCalledWith(type, id, { foo: 'bar', namespace: currentSpace.expectedNamespace });
      });
    });

    describe('#bulkGet', () => {
      test(`throws error if options.namespace is specified`, async () => {
        const request = createMockRequest({ id: currentSpace.id });
        const baseClient = createMockClient();
        const spacesService = createSpacesService(server);

        const client = new SpacesSavedObjectsClient({
          request,
          baseClient,
          spacesService,
        });

        await expect(client.bulkGet(null, { namespace: 'bar' })).rejects.toThrowErrorMatchingSnapshot();
      });

      test(`supplements options with undefined namespace`, async () => {
        const request = createMockRequest({ id: currentSpace.id });
        const baseClient = createMockClient();
        const expectedReturnValue = Symbol();
        baseClient.bulkGet.mockReturnValue(expectedReturnValue);
        const spacesService = createSpacesService(server);

        const client = new SpacesSavedObjectsClient({
          request,
          baseClient,
          spacesService,
        });

        const objects = Symbol();
        const options = Object.freeze({ foo: 'bar' });
        const actualReturnValue = await client.bulkGet(objects, options);

        expect(actualReturnValue).toBe(expectedReturnValue);
        expect(baseClient.bulkGet).toHaveBeenCalledWith(objects, { foo: 'bar', namespace: currentSpace.expectedNamespace });
      });
    });

    describe('#find', () => {
      test(`throws error if options.namespace is specified`, async () => {
        const request = createMockRequest({ id: currentSpace.id });
        const baseClient = createMockClient();
        const spacesService = createSpacesService(server);

        const client = new SpacesSavedObjectsClient({
          request,
          baseClient,
          spacesService,
        });

        await expect(client.find({ namespace: 'bar' })).rejects.toThrowErrorMatchingSnapshot();
      });

      test(`supplements options with undefined namespace`, async () => {
        const request = createMockRequest({ id: currentSpace.id });
        const baseClient = createMockClient();
        const expectedReturnValue = Symbol();
        baseClient.find.mockReturnValue(expectedReturnValue);
        const spacesService = createSpacesService(server);

        const client = new SpacesSavedObjectsClient({
          request,
          baseClient,
          spacesService,
        });

        const options = Object.freeze({ type: ['foo', 'bar'] });
        const actualReturnValue = await client.find(options);

        expect(actualReturnValue).toBe(expectedReturnValue);
        expect(baseClient.find).toHaveBeenCalledWith({ type: ['foo', 'bar'], namespace: currentSpace.expectedNamespace });
      });
    });

    describe('#create', () => {
      test(`throws error if options.namespace is specified`, async () => {
        const request = createMockRequest({ id: currentSpace.id });
        const baseClient = createMockClient();
        const spacesService = createSpacesService(server);

        const client = new SpacesSavedObjectsClient({
          request,
          baseClient,
          spacesService,

        });

        await expect(client.create('foo', {}, { namespace: 'bar' })).rejects.toThrowErrorMatchingSnapshot();
      });

      test(`supplements options with undefined namespace`, async () => {
        const request = createMockRequest({ id: currentSpace.id });
        const baseClient = createMockClient();
        const expectedReturnValue = Symbol();
        baseClient.create.mockReturnValue(expectedReturnValue);
        const spacesService = createSpacesService(server);

        const client = new SpacesSavedObjectsClient({
          request,
          baseClient,
          spacesService,
        });

        const type = Symbol();
        const attributes = Symbol();
        const options = Object.freeze({ foo: 'bar' });
        const actualReturnValue = await client.create(type, attributes, options);

        expect(actualReturnValue).toBe(expectedReturnValue);
        expect(baseClient.create).toHaveBeenCalledWith(type, attributes, { foo: 'bar', namespace: currentSpace.expectedNamespace });
      });
    });

    describe('#bulkCreate', () => {
      test(`throws error if options.namespace is specified`, async () => {
        const request = createMockRequest({ id: currentSpace.id });
        const baseClient = createMockClient();
        const spacesService = createSpacesService(server);

        const client = new SpacesSavedObjectsClient({
          request,
          baseClient,
          spacesService,
        });

        await expect(client.bulkCreate(null, { namespace: 'bar' })).rejects.toThrowErrorMatchingSnapshot();
      });

      test(`supplements options with undefined namespace`, async () => {
        const request = createMockRequest({ id: currentSpace.id });
        const baseClient = createMockClient();
        const expectedReturnValue = Symbol();
        baseClient.bulkCreate.mockReturnValue(expectedReturnValue);
        const spacesService = createSpacesService(server);

        const client = new SpacesSavedObjectsClient({
          request,
          baseClient,
          spacesService,
        });

        const objects = Symbol();
        const options = Object.freeze({ foo: 'bar' });
        const actualReturnValue = await client.bulkCreate(objects, options);

        expect(actualReturnValue).toBe(expectedReturnValue);
        expect(baseClient.bulkCreate).toHaveBeenCalledWith(objects, { foo: 'bar', namespace: currentSpace.expectedNamespace });
      });
    });

    describe('#update', () => {
      test(`throws error if options.namespace is specified`, async () => {
        const request = createMockRequest({ id: currentSpace.id });
        const baseClient = createMockClient();
        const spacesService = createSpacesService(server);

        const client = new SpacesSavedObjectsClient({
          request,
          baseClient,
          spacesService,
        });

        await expect(client.update(null, null, null, { namespace: 'bar' })).rejects.toThrowErrorMatchingSnapshot();
      });

      test(`supplements options with undefined namespace`, async () => {
        const request = createMockRequest({ id: currentSpace.id });
        const baseClient = createMockClient();
        const expectedReturnValue = Symbol();
        baseClient.update.mockReturnValue(expectedReturnValue);
        const spacesService = createSpacesService(server);

        const client = new SpacesSavedObjectsClient({
          request,
          baseClient,
          spacesService,
        });

        const type = Symbol();
        const id = Symbol();
        const attributes = Symbol();
        const options = Object.freeze({ foo: 'bar' });
        const actualReturnValue = await client.update(type, id, attributes, options);

        expect(actualReturnValue).toBe(expectedReturnValue);
        expect(baseClient.update).toHaveBeenCalledWith(type, id, attributes, { foo: 'bar', namespace: currentSpace.expectedNamespace });
      });
    });

    describe('#delete', () => {
      test(`throws error if options.namespace is specified`, async () => {
        const request = createMockRequest({ id: currentSpace.id });
        const baseClient = createMockClient();
        const spacesService = createSpacesService(server);

        const client = new SpacesSavedObjectsClient({
          request,
          baseClient,
          spacesService,
        });

        await expect(client.delete(null, null, { namespace: 'bar' })).rejects.toThrowErrorMatchingSnapshot();
      });

      test(`supplements options with undefined namespace`, async () => {
        const request = createMockRequest({ id: currentSpace.id });
        const baseClient = createMockClient();
        const expectedReturnValue = Symbol();
        baseClient.delete.mockReturnValue(expectedReturnValue);
        const spacesService = createSpacesService(server);

        const client = new SpacesSavedObjectsClient({
          request,
          baseClient,
          spacesService,
        });

        const type = Symbol();
        const id = Symbol();
        const options = Object.freeze({ foo: 'bar' });
        const actualReturnValue = await client.delete(type, id, options);

        expect(actualReturnValue).toBe(expectedReturnValue);
        expect(baseClient.delete).toHaveBeenCalledWith(type, id, { foo: 'bar', namespace: currentSpace.expectedNamespace });
      });
    });
  });

});
