/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUpdatableSavedObjectTypesMock } from './assignment_service.test.mocks';
import {
  httpServerMock,
  savedObjectsClientMock,
  savedObjectsTypeRegistryMock,
} from '@kbn/core/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { createSavedObject, createReference } from '../../../common/test_utils';
import { taggableTypes } from '../../../common/constants';
import { AssignmentService } from './assignment_service';

describe('AssignmentService', () => {
  let service: AssignmentService;
  let savedObjectClient: ReturnType<typeof savedObjectsClientMock.create>;
  let request: ReturnType<typeof httpServerMock.createKibanaRequest>;
  let authorization: ReturnType<typeof securityMock.createSetup>['authz'];
  let typeRegistry: ReturnType<typeof savedObjectsTypeRegistryMock.create>;

  beforeEach(() => {
    request = httpServerMock.createKibanaRequest();
    authorization = securityMock.createSetup().authz;
    savedObjectClient = savedObjectsClientMock.create();
    typeRegistry = savedObjectsTypeRegistryMock.create();

    service = new AssignmentService({
      request,
      typeRegistry,
      authorization,
      client: savedObjectClient,
    });
  });

  afterEach(() => {
    getUpdatableSavedObjectTypesMock.mockReset();
  });

  describe('#updateTagAssignments', () => {
    beforeEach(() => {
      getUpdatableSavedObjectTypesMock.mockImplementation(({ types }) => Promise.resolve(types));

      savedObjectClient.bulkGet.mockResolvedValue({
        saved_objects: [],
      });
    });

    it('throws an error if trying to assign non-taggable types', async () => {
      await expect(
        service.updateTagAssignments({
          tags: ['tag-1', 'tag-2'],
          assign: [
            { type: 'dashboard', id: 'dash-1' },
            { type: 'not-supported', id: 'foo' },
          ],
          unassign: [],
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Unsupported type [not-supported]"`);
    });

    it('throws an error if trying to assign non-assignable types', async () => {
      getUpdatableSavedObjectTypesMock.mockResolvedValue(['dashboard']);

      await expect(
        service.updateTagAssignments({
          tags: ['tag-1', 'tag-2'],
          assign: [
            { type: 'dashboard', id: 'dash-1' },
            { type: 'map', id: 'map-1' },
          ],
          unassign: [],
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Forbidden type [map]"`);
    });

    it('calls `soClient.bulkGet` with the correct parameters', async () => {
      await service.updateTagAssignments({
        tags: ['tag-1', 'tag-2'],
        assign: [{ type: 'dashboard', id: 'dash-1' }],
        unassign: [{ type: 'map', id: 'map-1' }],
      });

      expect(savedObjectClient.bulkGet).toHaveBeenCalledTimes(1);
      expect(savedObjectClient.bulkGet).toHaveBeenCalledWith([
        { type: 'dashboard', id: 'dash-1', fields: [] },
        { type: 'map', id: 'map-1', fields: [] },
      ]);
    });

    it('throws an error if any result from `soClient.bulkGet` has an error', async () => {
      savedObjectClient.bulkGet.mockResolvedValue({
        saved_objects: [
          createSavedObject({ type: 'dashboard', id: 'dash-1' }),
          createSavedObject({
            type: 'map',
            id: 'map-1',
            error: {
              statusCode: 404,
              message: 'not found',
              error: 'object was not found',
            },
          }),
        ],
      });

      await expect(
        service.updateTagAssignments({
          tags: ['tag-1', 'tag-2'],
          assign: [{ type: 'dashboard', id: 'dash-1' }],
          unassign: [{ type: 'map', id: 'map-1' }],
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"not found"`);
    });

    it('calls `soClient.bulkUpdate` to update the references', async () => {
      savedObjectClient.bulkGet.mockResolvedValue({
        saved_objects: [
          createSavedObject({
            type: 'dashboard',
            id: 'dash-1',
            references: [],
          }),
          createSavedObject({
            type: 'map',
            id: 'map-1',
            references: [createReference('dashboard', 'dash-1'), createReference('tag', 'tag-1')],
          }),
        ],
      });

      await service.updateTagAssignments({
        tags: ['tag-1', 'tag-2'],
        assign: [{ type: 'dashboard', id: 'dash-1' }],
        unassign: [{ type: 'map', id: 'map-1' }],
      });

      expect(savedObjectClient.bulkUpdate).toHaveBeenCalledTimes(1);
      expect(savedObjectClient.bulkUpdate).toHaveBeenCalledWith([
        {
          type: 'dashboard',
          id: 'dash-1',
          attributes: {},
          references: [createReference('tag', 'tag-1'), createReference('tag', 'tag-2')],
        },
        {
          type: 'map',
          id: 'map-1',
          attributes: {},
          references: [createReference('dashboard', 'dash-1')],
        },
      ]);
    });
  });

  describe('#findAssignableObjects', () => {
    beforeEach(() => {
      getUpdatableSavedObjectTypesMock.mockImplementation(({ types }) => Promise.resolve(types));
      typeRegistry.getType.mockImplementation(
        (name) =>
          ({
            management: {
              defaultSearchField: `${name}-search-field`,
            },
          } as any)
      );
      savedObjectClient.find.mockResolvedValue({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 20,
      });
    });

    it('calls `soClient.find` with the correct parameters', async () => {
      await service.findAssignableObjects({
        types: ['dashboard', 'map'],
        search: 'term',
        maxResults: 20,
      });

      expect(savedObjectClient.find).toHaveBeenCalledTimes(1);
      expect(savedObjectClient.find).toHaveBeenCalledWith({
        page: 1,
        perPage: 20,
        search: 'term',
        type: ['dashboard', 'map'],
        searchFields: ['dashboard-search-field', 'map-search-field'],
      });
    });

    it('filters the non-assignable types', async () => {
      getUpdatableSavedObjectTypesMock.mockResolvedValue(['dashboard']);

      await service.findAssignableObjects({
        types: ['dashboard', 'map'],
        search: 'term',
        maxResults: 20,
      });

      expect(savedObjectClient.find).toHaveBeenCalledTimes(1);
      expect(savedObjectClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ['dashboard'],
        })
      );
    });

    it('converts the results returned from `soClient.find`', async () => {
      savedObjectClient.find.mockResolvedValue({
        saved_objects: [
          createSavedObject({
            type: 'dashboard',
            id: 'dash-1',
          }),
          createSavedObject({
            type: 'map',
            id: 'dash-2',
          }),
        ] as any[],
        total: 2,
        page: 1,
        per_page: 20,
      });

      const results = await service.findAssignableObjects({
        types: ['dashboard', 'map'],
        search: 'term',
        maxResults: 20,
      });

      expect(results.map(({ type, id }) => ({ type, id }))).toEqual([
        { type: 'dashboard', id: 'dash-1' },
        { type: 'map', id: 'dash-2' },
      ]);
    });
  });

  describe('#getAssignableTypes', () => {
    it('calls `getUpdatableSavedObjectTypes` with the correct parameters', async () => {
      await service.getAssignableTypes(['type-a', 'type-b']);

      expect(getUpdatableSavedObjectTypesMock).toHaveBeenCalledTimes(1);
      expect(getUpdatableSavedObjectTypesMock).toHaveBeenCalledWith({
        request,
        authorization,
        types: ['type-a', 'type-b'],
      });
    });
    it('calls `getUpdatableSavedObjectTypes` with `taggableTypes` when `types` is not specified ', async () => {
      await service.getAssignableTypes();

      expect(getUpdatableSavedObjectTypesMock).toHaveBeenCalledTimes(1);
      expect(getUpdatableSavedObjectTypesMock).toHaveBeenCalledWith({
        request,
        authorization,
        types: taggableTypes,
      });
    });
    it('forward the result of `getUpdatableSavedObjectTypes`', async () => {
      getUpdatableSavedObjectTypesMock.mockReturnValue(['updatable-a', 'updatable-b']);

      const assignableTypes = await service.getAssignableTypes();

      expect(assignableTypes).toEqual(['updatable-a', 'updatable-b']);
    });
  });
});
