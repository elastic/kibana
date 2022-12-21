/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { createAssignableObject } from '../../../common/test_utils';
import { TagAssignmentService } from './assignment_service';

describe('TagAssignmentService', () => {
  let service: TagAssignmentService;
  let http: ReturnType<typeof httpServiceMock.createSetupContract>;

  beforeEach(() => {
    http = httpServiceMock.createSetupContract();
    service = new TagAssignmentService({ http });

    http.get.mockResolvedValue({});
    http.post.mockResolvedValue({});
  });

  describe('#findAssignableObjects', () => {
    it('calls `http.get` with the correct parameters', async () => {
      await service.findAssignableObjects({
        maxResults: 50,
        search: 'term',
        types: ['dashboard', 'maps'],
      });

      expect(http.get).toHaveBeenCalledTimes(1);
      expect(http.get).toHaveBeenCalledWith(
        '/internal/saved_objects_tagging/assignments/_find_assignable_objects',
        {
          query: {
            max_results: 50,
            search: 'term',
            types: ['dashboard', 'maps'],
          },
        }
      );
    });
    it('returns the objects from the response', async () => {
      const results = [
        createAssignableObject({ type: 'dashboard', id: '1' }),
        createAssignableObject({ type: 'map', id: '2' }),
      ];
      http.get.mockResolvedValue({
        objects: results,
      });

      const objects = await service.findAssignableObjects({});
      expect(objects).toEqual(results);
    });
  });

  describe('#updateTagAssignments', () => {
    it('calls `http.post` with the correct parameters', async () => {
      await service.updateTagAssignments({
        tags: ['tag-1', 'tag-2'],
        assign: [{ type: 'dashboard', id: 'dash-1' }],
        unassign: [{ type: 'map', id: 'map-1' }],
      });

      expect(http.post).toHaveBeenCalledTimes(1);
      expect(http.post).toHaveBeenCalledWith(
        '/api/saved_objects_tagging/assignments/update_by_tags',
        {
          body: JSON.stringify({
            tags: ['tag-1', 'tag-2'],
            assign: [{ type: 'dashboard', id: 'dash-1' }],
            unassign: [{ type: 'map', id: 'map-1' }],
          }),
        }
      );
    });
  });

  describe('#getAssignableTypes', () => {
    it('calls `http.get` with the correct parameters', async () => {
      await service.getAssignableTypes();

      expect(http.get).toHaveBeenCalledTimes(1);
      expect(http.get).toHaveBeenCalledWith(
        '/internal/saved_objects_tagging/assignments/_assignable_types'
      );
    });
    it('returns the types from the response', async () => {
      http.get.mockResolvedValue({
        types: ['dashboard', 'maps'],
      });

      const types = await service.getAssignableTypes();
      expect(types).toEqual(['dashboard', 'maps']);
    });
  });
});
