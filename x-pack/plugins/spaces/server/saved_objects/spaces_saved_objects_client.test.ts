/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { SavedObject, SavedObjectsType } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { savedObjectsClientMock, savedObjectsTypeRegistryMock } from '@kbn/core/server/mocks';

import { DEFAULT_SPACE_ID } from '../../common/constants';
import { spacesClientMock } from '../spaces_client/spaces_client.mock';
import { spacesServiceMock } from '../spaces_service/spaces_service.mock';
import { SpacesSavedObjectsClient } from './spaces_saved_objects_client';

const createMockRequest = () => ({});

const createMockClient = () => savedObjectsClientMock.create();

const createSpacesService = (spaceId: string) => {
  return spacesServiceMock.createStartContract(spaceId);
};

const createMockResponse = () => ({
  id: 'logstash-*',
  title: 'logstash-*',
  type: 'logstash-type',
  attributes: {},
  timeFieldName: '@timestamp',
  notExpandable: true,
  references: [],
  score: 0,
});

const ERROR_NAMESPACE_SPECIFIED = 'Spaces currently determines the namespaces';

[
  { id: DEFAULT_SPACE_ID, expectedNamespace: undefined },
  { id: 'space_1', expectedNamespace: 'space_1' },
].forEach((currentSpace) => {
  describe(`${currentSpace.id} space`, () => {
    const createSpacesSavedObjectsClient = () => {
      const request = createMockRequest();
      const baseClient = createMockClient();
      const spacesService = createSpacesService(currentSpace.id);
      const spacesClient = spacesClientMock.create();
      spacesService.createSpacesClient.mockReturnValue(spacesClient);
      const typeRegistry = savedObjectsTypeRegistryMock.create();
      typeRegistry.getAllTypes.mockReturnValue([
        // for test purposes we only need the names of the object types
        { name: 'foo' },
        { name: 'bar' },
        { name: 'space' },
      ] as unknown as SavedObjectsType[]);

      const client = new SpacesSavedObjectsClient({
        request,
        baseClient,
        getSpacesService: () => spacesService,
        typeRegistry,
      });
      return { client, baseClient, spacesClient, typeRegistry };
    };

    describe('#get', () => {
      test(`throws error if options.namespace is specified`, async () => {
        const { client } = createSpacesSavedObjectsClient();

        await expect(client.get('foo', '', { namespace: 'bar' })).rejects.toThrow(
          ERROR_NAMESPACE_SPECIFIED
        );
      });

      test(`supplements options with the current namespace`, async () => {
        const { client, baseClient } = createSpacesSavedObjectsClient();
        const expectedReturnValue = createMockResponse();
        baseClient.get.mockReturnValue(Promise.resolve(expectedReturnValue));

        const type = Symbol();
        const id = Symbol();
        const options = Object.freeze({ foo: 'bar' });
        // @ts-expect-error
        const actualReturnValue = await client.get(type, id, options);

        expect(actualReturnValue).toBe(expectedReturnValue);
        expect(baseClient.get).toHaveBeenCalledWith(type, id, {
          foo: 'bar',
          namespace: currentSpace.expectedNamespace,
        });
      });
    });

    describe('#bulkResolve', () => {
      test(`throws error if options.namespace is specified`, async () => {
        const { client } = createSpacesSavedObjectsClient();

        await expect(client.bulkResolve([], { namespace: 'bar' })).rejects.toThrow(
          ERROR_NAMESPACE_SPECIFIED
        );
      });

      test(`supplements options with the current namespace`, async () => {
        const { client, baseClient } = createSpacesSavedObjectsClient();
        const expectedReturnValue = { resolved_objects: [] };
        baseClient.bulkResolve.mockReturnValue(Promise.resolve(expectedReturnValue));

        const options = Object.freeze({ foo: 'bar' });
        // @ts-expect-error
        const actualReturnValue = await client.bulkResolve([], options);

        expect(actualReturnValue).toBe(expectedReturnValue);
        expect(baseClient.bulkResolve).toHaveBeenCalledWith([], {
          foo: 'bar',
          namespace: currentSpace.expectedNamespace,
        });
      });
    });

    describe('#resolve', () => {
      test(`throws error if options.namespace is specified`, async () => {
        const { client } = createSpacesSavedObjectsClient();

        await expect(client.resolve('foo', '', { namespace: 'bar' })).rejects.toThrow(
          ERROR_NAMESPACE_SPECIFIED
        );
      });

      test(`supplements options with the current namespace`, async () => {
        const { client, baseClient } = createSpacesSavedObjectsClient();
        const expectedReturnValue = {
          saved_object: createMockResponse(),
          outcome: 'exactMatch' as 'exactMatch', // outcome doesn't matter, just including it for type safety
        };
        baseClient.resolve.mockReturnValue(Promise.resolve(expectedReturnValue));

        const type = Symbol();
        const id = Symbol();
        const options = Object.freeze({ foo: 'bar' });
        // @ts-expect-error
        const actualReturnValue = await client.resolve(type, id, options);

        expect(actualReturnValue).toBe(expectedReturnValue);
        expect(baseClient.resolve).toHaveBeenCalledWith(type, id, {
          foo: 'bar',
          namespace: currentSpace.expectedNamespace,
        });
      });
    });

    describe('#bulkGet', () => {
      test(`throws error if options.namespace is specified`, async () => {
        const { client } = createSpacesSavedObjectsClient();

        await expect(
          client.bulkGet([{ id: '', type: 'foo' }], { namespace: 'bar' })
        ).rejects.toThrow(ERROR_NAMESPACE_SPECIFIED);
      });

      test(`supplements options with the current namespace`, async () => {
        const { client, baseClient, spacesClient } = createSpacesSavedObjectsClient();
        const expectedReturnValue = { saved_objects: [createMockResponse()] };
        baseClient.bulkGet.mockReturnValue(Promise.resolve(expectedReturnValue));

        const objects = [{ type: 'foo' }];
        const options = Object.freeze({ foo: 'bar' });
        // @ts-expect-error
        const actualReturnValue = await client.bulkGet(objects, options);

        expect(actualReturnValue).toEqual(expectedReturnValue);
        expect(baseClient.bulkGet).toHaveBeenCalledWith(objects, {
          foo: 'bar',
          namespace: currentSpace.expectedNamespace,
        });
        expect(spacesClient.getAll).not.toHaveBeenCalled();
      });

      test(`replaces object namespaces '*' with available spaces`, async () => {
        const { client, baseClient, spacesClient, typeRegistry } = createSpacesSavedObjectsClient();
        spacesClient.getAll.mockResolvedValue([
          { id: 'available-space-a', name: 'a', disabledFeatures: [] },
          { id: 'available-space-b', name: 'b', disabledFeatures: [] },
        ]);
        typeRegistry.isNamespaceAgnostic.mockImplementation((type) => type === 'foo');
        typeRegistry.isShareable.mockImplementation((type) => type === 'bar');
        // 'baz' is neither agnostic nor shareable, so it is isolated (namespaceType: 'single' or namespaceType: 'multiple-isolated')
        baseClient.bulkGet.mockResolvedValue({
          saved_objects: [
            { type: 'foo', id: '1', key: 'val' },
            { type: 'bar', id: '2', key: 'val' },
            { type: 'baz', id: '3', key: 'val' }, // this should be replaced with a 400 error
            { type: 'foo', id: '4', key: 'val' },
            { type: 'bar', id: '5', key: 'val' },
            { type: 'baz', id: '6', key: 'val' }, // this should not be replaced with a 400 error because the user did not search for it in '*' all spaces
          ] as unknown as SavedObject[],
        });

        const objects = [
          { type: 'foo', id: '1', namespaces: ['*', 'this-is-ignored'] },
          { type: 'bar', id: '2', namespaces: ['*', 'this-is-ignored'] },
          { type: 'baz', id: '3', namespaces: ['*', 'this-is-ignored'] },
          { type: 'foo', id: '4', namespaces: ['another-space'] },
          { type: 'bar', id: '5', namespaces: ['another-space'] },
          { type: 'baz', id: '6', namespaces: ['another-space'] },
        ];
        const result = await client.bulkGet(objects);

        expect(result.saved_objects).toEqual([
          { type: 'foo', id: '1', key: 'val' },
          { type: 'bar', id: '2', key: 'val' },
          {
            type: 'baz',
            id: '3',
            error: SavedObjectsErrorHelpers.createBadRequestError(
              '"namespaces" can only specify a single space when used with space-isolated types'
            ).output.payload,
          },
          { type: 'foo', id: '4', key: 'val' },
          { type: 'bar', id: '5', key: 'val' },
          { type: 'baz', id: '6', key: 'val' },
        ]);
        expect(baseClient.bulkGet).toHaveBeenCalledWith(
          [
            { type: 'foo', id: '1', namespaces: ['available-space-a', 'available-space-b'] },
            { type: 'bar', id: '2', namespaces: ['available-space-a', 'available-space-b'] },
            { type: 'baz', id: '3', namespaces: ['available-space-a', 'available-space-b'] },
            // even if another space doesn't exist, it can be specified explicitly
            { type: 'foo', id: '4', namespaces: ['another-space'] },
            { type: 'bar', id: '5', namespaces: ['another-space'] },
            { type: 'baz', id: '6', namespaces: ['another-space'] },
          ],
          { namespace: currentSpace.expectedNamespace }
        );
        expect(spacesClient.getAll).toHaveBeenCalledTimes(1);
      });

      test(`replaces object namespaces '*' with an empty array when the user doesn't have access to any spaces`, async () => {
        const { client, baseClient, spacesClient } = createSpacesSavedObjectsClient();
        spacesClient.getAll.mockRejectedValue(Boom.forbidden());
        baseClient.bulkGet.mockResolvedValue({ saved_objects: [] }); // doesn't matter for this test

        const objects = [
          { type: 'foo', id: '1', namespaces: ['*'] },
          { type: 'bar', id: '2', namespaces: ['*', 'this-is-ignored'] },
          { type: 'baz', id: '3', namespaces: ['another-space'] },
        ];
        await client.bulkGet(objects);

        expect(baseClient.bulkGet).toHaveBeenCalledWith(
          [
            { type: 'foo', id: '1', namespaces: [] },
            { type: 'bar', id: '2', namespaces: [] },
            { type: 'baz', id: '3', namespaces: ['another-space'] }, // even if another space doesn't exist, it can be specified explicitly
          ],
          { namespace: currentSpace.expectedNamespace }
        );
        expect(spacesClient.getAll).toHaveBeenCalledTimes(1);
      });
    });

    describe('#find', () => {
      const EMPTY_RESPONSE = { saved_objects: [], total: 0, per_page: 20, page: 1 };

      test(`returns empty result if user is unauthorized in this space`, async () => {
        const { client, baseClient, spacesClient } = createSpacesSavedObjectsClient();
        spacesClient.getAll.mockResolvedValue([]);

        const options = Object.freeze({ type: 'foo', namespaces: ['some-ns'] });
        const actualReturnValue = await client.find(options);

        expect(actualReturnValue).toEqual(EMPTY_RESPONSE);
        expect(baseClient.find).not.toHaveBeenCalled();
      });

      test(`returns empty result if user is unauthorized in any space`, async () => {
        const { client, baseClient, spacesClient } = createSpacesSavedObjectsClient();
        spacesClient.getAll.mockRejectedValue(Boom.forbidden());

        const options = Object.freeze({ type: 'foo', namespaces: ['some-ns'] });
        const actualReturnValue = await client.find(options);

        expect(actualReturnValue).toEqual(EMPTY_RESPONSE);
        expect(baseClient.find).not.toHaveBeenCalled();
      });

      test(`passes options.type to baseClient if valid singular type specified`, async () => {
        const { client, baseClient } = createSpacesSavedObjectsClient();
        const expectedReturnValue = {
          saved_objects: [createMockResponse()].map((obj) => ({ ...obj, score: 1 })),
          total: 1,
          per_page: 0,
          page: 0,
        };
        baseClient.find.mockReturnValue(Promise.resolve(expectedReturnValue));

        const options = Object.freeze({ type: 'foo' });
        const actualReturnValue = await client.find(options);

        expect(actualReturnValue).toBe(expectedReturnValue);
        expect(baseClient.find).toHaveBeenCalledWith({
          type: ['foo'],
          namespaces: [currentSpace.expectedNamespace ?? 'default'],
        });
      });

      test(`supplements options with the current namespace`, async () => {
        const { client, baseClient } = createSpacesSavedObjectsClient();
        const expectedReturnValue = {
          saved_objects: [createMockResponse()].map((obj) => ({ ...obj, score: 1 })),
          total: 1,
          per_page: 0,
          page: 0,
        };
        baseClient.find.mockReturnValue(Promise.resolve(expectedReturnValue));

        const options = Object.freeze({ type: ['foo', 'bar'] });
        const actualReturnValue = await client.find(options);

        expect(actualReturnValue).toBe(expectedReturnValue);
        expect(baseClient.find).toHaveBeenCalledWith({
          type: ['foo', 'bar'],
          namespaces: [currentSpace.expectedNamespace ?? 'default'],
        });
      });

      test(`passes options.namespaces along`, async () => {
        const { client, baseClient, spacesClient } = createSpacesSavedObjectsClient();
        const expectedReturnValue = {
          saved_objects: [createMockResponse()],
          total: 1,
          per_page: 0,
          page: 0,
        };
        baseClient.find.mockReturnValue(Promise.resolve(expectedReturnValue));

        spacesClient.getAll.mockImplementation(() =>
          Promise.resolve([
            { id: 'ns-1', name: '', disabledFeatures: [] },
            { id: 'ns-2', name: '', disabledFeatures: [] },
          ])
        );

        const options = Object.freeze({ type: ['foo', 'bar'], namespaces: ['ns-1', 'ns-2'] });
        const actualReturnValue = await client.find(options);

        expect(actualReturnValue).toBe(expectedReturnValue);
        expect(baseClient.find).toHaveBeenCalledWith({
          type: ['foo', 'bar'],
          namespaces: ['ns-1', 'ns-2'],
        });
        expect(spacesClient.getAll).toHaveBeenCalledWith({ purpose: 'findSavedObjects' });
      });

      test(`filters options.namespaces based on authorization`, async () => {
        const { client, baseClient, spacesClient } = createSpacesSavedObjectsClient();
        const expectedReturnValue = {
          saved_objects: [createMockResponse()],
          total: 1,
          per_page: 0,
          page: 0,
        };
        baseClient.find.mockReturnValue(Promise.resolve(expectedReturnValue));

        spacesClient.getAll.mockImplementation(() =>
          Promise.resolve([
            { id: 'ns-1', name: '', disabledFeatures: [] },
            { id: 'ns-2', name: '', disabledFeatures: [] },
          ])
        );

        const options = Object.freeze({ type: ['foo', 'bar'], namespaces: ['ns-1', 'ns-3'] });
        const actualReturnValue = await client.find(options);

        expect(actualReturnValue).toBe(expectedReturnValue);
        expect(baseClient.find).toHaveBeenCalledWith({
          type: ['foo', 'bar'],
          namespaces: ['ns-1'],
        });
        expect(spacesClient.getAll).toHaveBeenCalledWith({ purpose: 'findSavedObjects' });
      });

      test(`translates options.namespace: ['*']`, async () => {
        const { client, baseClient, spacesClient } = createSpacesSavedObjectsClient();
        const expectedReturnValue = {
          saved_objects: [createMockResponse()],
          total: 1,
          per_page: 0,
          page: 0,
        };
        baseClient.find.mockReturnValue(Promise.resolve(expectedReturnValue));

        spacesClient.getAll.mockImplementation(() =>
          Promise.resolve([
            { id: 'ns-1', name: '', disabledFeatures: [] },
            { id: 'ns-2', name: '', disabledFeatures: [] },
          ])
        );

        const options = Object.freeze({ type: ['foo', 'bar'], namespaces: ['*'] });
        const actualReturnValue = await client.find(options);

        expect(actualReturnValue).toBe(expectedReturnValue);
        expect(baseClient.find).toHaveBeenCalledWith({
          type: ['foo', 'bar'],
          namespaces: ['ns-1', 'ns-2'],
        });
        expect(spacesClient.getAll).toHaveBeenCalledWith({ purpose: 'findSavedObjects' });
      });
    });

    describe('#checkConflicts', () => {
      test(`throws error if options.namespace is specified`, async () => {
        const { client } = createSpacesSavedObjectsClient();

        await expect(
          // @ts-expect-error
          client.checkConflicts(null, { namespace: 'bar' })
        ).rejects.toThrow(ERROR_NAMESPACE_SPECIFIED);
      });

      test(`supplements options with the current namespace`, async () => {
        const { client, baseClient } = createSpacesSavedObjectsClient();
        const expectedReturnValue = { errors: [] };
        baseClient.checkConflicts.mockReturnValue(Promise.resolve(expectedReturnValue));

        const objects = Symbol();
        const options = Object.freeze({ foo: 'bar' });
        // @ts-expect-error
        const actualReturnValue = await client.checkConflicts(objects, options);

        expect(actualReturnValue).toBe(expectedReturnValue);
        expect(baseClient.checkConflicts).toHaveBeenCalledWith(objects, {
          foo: 'bar',
          namespace: currentSpace.expectedNamespace,
        });
      });
    });

    describe('#create', () => {
      test(`throws error if options.namespace is specified`, async () => {
        const { client } = createSpacesSavedObjectsClient();

        await expect(client.create('foo', {}, { namespace: 'bar' })).rejects.toThrow(
          ERROR_NAMESPACE_SPECIFIED
        );
      });

      test(`supplements options with the current namespace`, async () => {
        const { client, baseClient } = createSpacesSavedObjectsClient();
        const expectedReturnValue = createMockResponse();
        baseClient.create.mockReturnValue(Promise.resolve(expectedReturnValue));

        const type = Symbol();
        const attributes = Symbol();
        const options = Object.freeze({ foo: 'bar' });
        // @ts-expect-error
        const actualReturnValue = await client.create(type, attributes, options);

        expect(actualReturnValue).toBe(expectedReturnValue);
        expect(baseClient.create).toHaveBeenCalledWith(type, attributes, {
          foo: 'bar',
          namespace: currentSpace.expectedNamespace,
        });
      });
    });

    describe('#bulkCreate', () => {
      test(`throws error if options.namespace is specified`, async () => {
        const { client } = createSpacesSavedObjectsClient();

        await expect(
          client.bulkCreate([{ id: '', type: 'foo', attributes: {} }], { namespace: 'bar' })
        ).rejects.toThrow(ERROR_NAMESPACE_SPECIFIED);
      });

      test(`supplements options with the current namespace`, async () => {
        const { client, baseClient } = createSpacesSavedObjectsClient();
        const expectedReturnValue = { saved_objects: [createMockResponse()] };
        baseClient.bulkCreate.mockReturnValue(Promise.resolve(expectedReturnValue));

        const objects = [{ type: 'foo' }];
        const options = Object.freeze({ foo: 'bar' });
        // @ts-expect-error
        const actualReturnValue = await client.bulkCreate(objects, options);

        expect(actualReturnValue).toBe(expectedReturnValue);
        expect(baseClient.bulkCreate).toHaveBeenCalledWith(objects, {
          foo: 'bar',
          namespace: currentSpace.expectedNamespace,
        });
      });
    });

    describe('#update', () => {
      test(`throws error if options.namespace is specified`, async () => {
        const { client } = createSpacesSavedObjectsClient();

        await expect(
          // @ts-expect-error
          client.update(null, null, null, { namespace: 'bar' })
        ).rejects.toThrow(ERROR_NAMESPACE_SPECIFIED);
      });

      test(`supplements options with the current namespace`, async () => {
        const { client, baseClient } = createSpacesSavedObjectsClient();
        const expectedReturnValue = createMockResponse();
        baseClient.update.mockReturnValue(Promise.resolve(expectedReturnValue));

        const type = Symbol();
        const id = Symbol();
        const attributes = Symbol();
        const options = Object.freeze({ foo: 'bar' });
        // @ts-expect-error
        const actualReturnValue = await client.update(type, id, attributes, options);

        expect(actualReturnValue).toBe(expectedReturnValue);
        expect(baseClient.update).toHaveBeenCalledWith(type, id, attributes, {
          foo: 'bar',
          namespace: currentSpace.expectedNamespace,
        });
      });
    });

    describe('#bulkUpdate', () => {
      test(`throws error if options.namespace is specified`, async () => {
        const { client } = createSpacesSavedObjectsClient();

        await expect(
          // @ts-expect-error
          client.bulkUpdate(null, { namespace: 'bar' })
        ).rejects.toThrow(ERROR_NAMESPACE_SPECIFIED);
      });

      test(`supplements options with the current namespace`, async () => {
        const { client, baseClient } = createSpacesSavedObjectsClient();
        const expectedReturnValue = { saved_objects: [createMockResponse()] };
        baseClient.bulkUpdate.mockReturnValue(Promise.resolve(expectedReturnValue));

        const actualReturnValue = await client.bulkUpdate([
          { id: 'id', type: 'foo', attributes: {}, references: [] },
        ]);

        expect(actualReturnValue).toBe(expectedReturnValue);
        expect(baseClient.bulkUpdate).toHaveBeenCalledWith(
          [
            {
              id: 'id',
              type: 'foo',
              attributes: {},
              references: [],
            },
          ],
          { namespace: currentSpace.expectedNamespace }
        );
      });
    });

    describe('#delete', () => {
      test(`throws error if options.namespace is specified`, async () => {
        const { client } = createSpacesSavedObjectsClient();

        await expect(
          // @ts-expect-error
          client.delete(null, null, { namespace: 'bar' })
        ).rejects.toThrow(ERROR_NAMESPACE_SPECIFIED);
      });

      test(`supplements options with the current namespace`, async () => {
        const { client, baseClient } = createSpacesSavedObjectsClient();
        const expectedReturnValue = createMockResponse();
        baseClient.delete.mockReturnValue(Promise.resolve(expectedReturnValue));

        const type = Symbol();
        const id = Symbol();
        const options = Object.freeze({ foo: 'bar' });
        // @ts-expect-error
        const actualReturnValue = await client.delete(type, id, options);

        expect(actualReturnValue).toBe(expectedReturnValue);
        expect(baseClient.delete).toHaveBeenCalledWith(type, id, {
          foo: 'bar',
          namespace: currentSpace.expectedNamespace,
        });
      });
    });

    describe('#removeReferencesTo', () => {
      test(`throws error if options.namespace is specified`, async () => {
        const { client } = createSpacesSavedObjectsClient();

        await expect(
          // @ts-expect-error
          client.removeReferencesTo(null, null, { namespace: 'bar' })
        ).rejects.toThrow(ERROR_NAMESPACE_SPECIFIED);
      });

      test(`supplements options with the current namespace`, async () => {
        const { client, baseClient } = createSpacesSavedObjectsClient();
        const expectedReturnValue = { updated: 12 };
        baseClient.removeReferencesTo.mockReturnValue(Promise.resolve(expectedReturnValue));

        const type = Symbol();
        const id = Symbol();
        const options = Object.freeze({ foo: 'bar' });
        // @ts-expect-error
        const actualReturnValue = await client.removeReferencesTo(type, id, options);

        expect(actualReturnValue).toBe(expectedReturnValue);
        expect(baseClient.removeReferencesTo).toHaveBeenCalledWith(type, id, {
          foo: 'bar',
          namespace: currentSpace.expectedNamespace,
        });
      });
    });

    describe('#openPointInTimeForType', () => {
      test(`throws error if if user is unauthorized in this space`, async () => {
        const { client, baseClient, spacesClient } = createSpacesSavedObjectsClient();
        spacesClient.getAll.mockResolvedValue([]);

        await expect(
          client.openPointInTimeForType('foo', { namespaces: ['bar'] })
        ).rejects.toThrowError('Bad Request');

        expect(baseClient.openPointInTimeForType).not.toHaveBeenCalled();
      });

      test(`throws error if if user is unauthorized in any space`, async () => {
        const { client, baseClient, spacesClient } = createSpacesSavedObjectsClient();
        spacesClient.getAll.mockRejectedValue(Boom.forbidden());

        await expect(
          client.openPointInTimeForType('foo', { namespaces: ['bar'] })
        ).rejects.toThrowError('Bad Request');

        expect(baseClient.openPointInTimeForType).not.toHaveBeenCalled();
      });

      test(`filters options.namespaces based on authorization`, async () => {
        const { client, baseClient, spacesClient } = createSpacesSavedObjectsClient();
        const expectedReturnValue = { id: 'abc123' };
        baseClient.openPointInTimeForType.mockReturnValue(Promise.resolve(expectedReturnValue));

        spacesClient.getAll.mockImplementation(() =>
          Promise.resolve([
            { id: 'ns-1', name: '', disabledFeatures: [] },
            { id: 'ns-2', name: '', disabledFeatures: [] },
          ])
        );

        const options = Object.freeze({ namespaces: ['ns-1', 'ns-3'] });
        const actualReturnValue = await client.openPointInTimeForType(['foo', 'bar'], options);

        expect(actualReturnValue).toBe(expectedReturnValue);
        expect(baseClient.openPointInTimeForType).toHaveBeenCalledWith(['foo', 'bar'], {
          namespaces: ['ns-1'],
        });
        expect(spacesClient.getAll).toHaveBeenCalledWith({ purpose: 'findSavedObjects' });
      });

      test(`translates options.namespaces: ['*']`, async () => {
        const { client, baseClient, spacesClient } = createSpacesSavedObjectsClient();
        const expectedReturnValue = { id: 'abc123' };
        baseClient.openPointInTimeForType.mockReturnValue(Promise.resolve(expectedReturnValue));

        spacesClient.getAll.mockImplementation(() =>
          Promise.resolve([
            { id: 'ns-1', name: '', disabledFeatures: [] },
            { id: 'ns-2', name: '', disabledFeatures: [] },
          ])
        );

        const options = Object.freeze({ namespaces: ['*'] });
        const actualReturnValue = await client.openPointInTimeForType(['foo', 'bar'], options);

        expect(actualReturnValue).toBe(expectedReturnValue);
        expect(baseClient.openPointInTimeForType).toHaveBeenCalledWith(['foo', 'bar'], {
          namespaces: ['ns-1', 'ns-2'],
        });
        expect(spacesClient.getAll).toHaveBeenCalledWith({ purpose: 'findSavedObjects' });
      });

      test(`supplements options with the current namespace if unspecified`, async () => {
        const { client, baseClient } = createSpacesSavedObjectsClient();
        const expectedReturnValue = { id: 'abc123' };
        baseClient.openPointInTimeForType.mockReturnValue(Promise.resolve(expectedReturnValue));

        const options = Object.freeze({ keepAlive: '2m' });
        const actualReturnValue = await client.openPointInTimeForType('foo', options);

        expect(actualReturnValue).toBe(expectedReturnValue);
        expect(baseClient.openPointInTimeForType).toHaveBeenCalledWith('foo', {
          keepAlive: '2m',
          namespaces: [currentSpace.expectedNamespace ?? DEFAULT_SPACE_ID],
        });
      });
    });

    describe('#closePointInTime', () => {
      test(`throws error if options.namespace is specified`, async () => {
        const { client } = createSpacesSavedObjectsClient();

        await expect(client.closePointInTime('foo', { namespace: 'bar' })).rejects.toThrow(
          ERROR_NAMESPACE_SPECIFIED
        );
      });

      test(`supplements options with the current namespace`, async () => {
        const { client, baseClient } = createSpacesSavedObjectsClient();
        const expectedReturnValue = { succeeded: true, num_freed: 1 };
        baseClient.closePointInTime.mockReturnValue(Promise.resolve(expectedReturnValue));

        const options = Object.freeze({ foo: 'bar' });
        // @ts-expect-error
        const actualReturnValue = await client.closePointInTime('foo', options);

        expect(actualReturnValue).toBe(expectedReturnValue);
        expect(baseClient.closePointInTime).toHaveBeenCalledWith('foo', {
          foo: 'bar',
          namespace: currentSpace.expectedNamespace,
        });
      });
    });

    describe('#createPointInTimeFinder', () => {
      test(`throws error if options.namespace is specified`, async () => {
        const { client } = createSpacesSavedObjectsClient();

        const options = { type: ['a', 'b'], search: 'query', namespace: 'oops' };
        expect(() => client.createPointInTimeFinder(options)).toThrow(ERROR_NAMESPACE_SPECIFIED);
      });

      it('redirects request to underlying base client with default dependencies', () => {
        const { client, baseClient } = createSpacesSavedObjectsClient();

        const options = { type: ['a', 'b'], search: 'query' };
        client.createPointInTimeFinder(options);

        expect(baseClient.createPointInTimeFinder).toHaveBeenCalledTimes(1);
        expect(baseClient.createPointInTimeFinder).toHaveBeenCalledWith(options, {
          client,
        });
      });

      it('redirects request to underlying base client with custom dependencies', () => {
        const { client, baseClient } = createSpacesSavedObjectsClient();

        const options = { type: ['a', 'b'], search: 'query' };
        const dependencies = {
          client: {
            find: jest.fn(),
            openPointInTimeForType: jest.fn(),
            closePointInTime: jest.fn(),
          },
        };
        client.createPointInTimeFinder(options, dependencies);

        expect(baseClient.createPointInTimeFinder).toHaveBeenCalledTimes(1);
        expect(baseClient.createPointInTimeFinder).toHaveBeenCalledWith(options, dependencies);
      });
    });

    describe('#collectMultiNamespaceReferences', () => {
      test(`throws error if options.namespace is specified`, async () => {
        const { client } = createSpacesSavedObjectsClient();

        await expect(
          client.collectMultiNamespaceReferences([], { namespace: 'bar' })
        ).rejects.toThrow(ERROR_NAMESPACE_SPECIFIED);
      });

      test(`supplements options with the current namespace`, async () => {
        const { client, baseClient } = createSpacesSavedObjectsClient();
        const expectedReturnValue = { objects: [] };
        baseClient.collectMultiNamespaceReferences.mockReturnValue(
          Promise.resolve(expectedReturnValue)
        );

        const objects = [{ type: 'foo', id: 'bar' }];
        const options = Object.freeze({ foo: 'bar' });
        // @ts-expect-error
        const actualReturnValue = await client.collectMultiNamespaceReferences(objects, options);

        expect(actualReturnValue).toBe(expectedReturnValue);
        expect(baseClient.collectMultiNamespaceReferences).toHaveBeenCalledWith(objects, {
          foo: 'bar',
          namespace: currentSpace.expectedNamespace,
        });
      });
    });

    describe('#updateObjectsSpaces', () => {
      test(`throws error if options.namespace is specified`, async () => {
        const { client } = createSpacesSavedObjectsClient();

        await expect(client.updateObjectsSpaces([], [], [], { namespace: 'bar' })).rejects.toThrow(
          ERROR_NAMESPACE_SPECIFIED
        );
      });

      test(`supplements options with the current namespace`, async () => {
        const { client, baseClient } = createSpacesSavedObjectsClient();
        const expectedReturnValue = { objects: [] };
        baseClient.updateObjectsSpaces.mockReturnValue(Promise.resolve(expectedReturnValue));

        const objects = [{ type: 'foo', id: 'bar' }];
        const spacesToAdd = ['space-x'];
        const spacesToRemove = ['space-y'];
        const options = Object.freeze({ foo: 'bar' });
        const actualReturnValue = await client.updateObjectsSpaces(
          objects,
          spacesToAdd,
          spacesToRemove,
          // @ts-expect-error
          options
        );

        expect(actualReturnValue).toBe(expectedReturnValue);
        expect(baseClient.updateObjectsSpaces).toHaveBeenCalledWith(
          objects,
          spacesToAdd,
          spacesToRemove,
          { foo: 'bar', namespace: currentSpace.expectedNamespace }
        );
      });
    });
  });
});
