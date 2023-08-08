/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getESQueryHostMetadataByID, buildUnitedIndexQuery } from './query_builders';
import { metadataCurrentIndexPattern } from '../../../../common/endpoint/constants';
import { get } from 'lodash';
import { expectedCompleteUnitedIndexQuery } from './query_builders.fixtures';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { EndpointSortableField } from '../../../../common/endpoint/types';

describe('query builder', () => {
  describe('MetadataGetQuery', () => {
    it('searches the correct index', () => {
      const query = getESQueryHostMetadataByID('nonsense-id');
      expect(query.index).toEqual(metadataCurrentIndexPattern);
    });

    it('searches for the correct ID', () => {
      const mockID = 'AABBCCDD-0011-2233-AA44-DEADBEEF8899';
      const query = getESQueryHostMetadataByID(mockID);

      expect(get(query, 'body.query.bool.filter.0.bool.should')).toContainEqual({
        term: { 'agent.id': mockID },
      });
    });

    it('supports HostDetails in schema for backwards compat', () => {
      const mockID = 'AABBCCDD-0011-2233-AA44-DEADBEEF8899';
      const query = getESQueryHostMetadataByID(mockID);

      expect(get(query, 'body.query.bool.filter.0.bool.should')).toContainEqual({
        term: { 'HostDetails.agent.id': mockID },
      });
    });
  });

  describe('buildUnitedIndexQuery', () => {
    it('correctly builds empty query', async () => {
      const soClient = savedObjectsClientMock.create();
      soClient.find.mockResolvedValue({
        saved_objects: [],
        total: 0,
        per_page: 0,
        page: 0,
      });

      const query = await buildUnitedIndexQuery(
        soClient,
        { page: 1, pageSize: 10, hostStatuses: [], kuery: '' },
        []
      );
      const expected = {
        bool: {
          must_not: {
            terms: {
              'agent.id': [
                '00000000-0000-0000-0000-000000000000',
                '11111111-1111-1111-1111-111111111111',
              ],
            },
          },
          filter: [
            {
              terms: {
                'united.agent.policy_id': [],
              },
            },
            {
              exists: {
                field: 'united.endpoint.agent.id',
              },
            },
            {
              exists: {
                field: 'united.agent.agent.id',
              },
            },
            {
              term: {
                'united.agent.active': {
                  value: true,
                },
              },
            },
          ],
        },
      };
      expect(query.body.query).toEqual(expected);
    });

    it('correctly builds query', async () => {
      const soClient = savedObjectsClientMock.create();
      soClient.find.mockResolvedValue({
        saved_objects: [],
        total: 0,
        per_page: 0,
        page: 0,
      });

      const query = await buildUnitedIndexQuery(
        soClient,
        {
          page: 1,
          pageSize: 10,
          kuery: 'united.endpoint.host.os.name : *',
          hostStatuses: ['healthy'],
        },
        ['test-endpoint-policy-id']
      );
      const expected = expectedCompleteUnitedIndexQuery;
      expect(query.body.query).toEqual(expected);
    });

    describe('sorting', () => {
      let soClient: jest.Mocked<SavedObjectsClientContract>;

      beforeEach(() => {
        soClient = savedObjectsClientMock.create();
        soClient.find.mockResolvedValue({
          saved_objects: [],
          total: 0,
          per_page: 0,
          page: 0,
        });
      });

      it('uses default sort field if none passed', async () => {
        const query = await buildUnitedIndexQuery(soClient, {
          page: 1,
          pageSize: 10,
        });

        expect(query.body.sort).toEqual([
          { 'united.agent.enrolled_at': { order: 'desc', unmapped_type: 'date' } },
        ]);
      });

      it.each`
        inputField                                 | mappedField
        ${'host_status'}                           | ${'status'}
        ${'metadata.host.hostname'}                | ${'united.endpoint.host.hostname'}
        ${'metadata.Endpoint.policy.applied.name'} | ${'united.endpoint.Endpoint.policy.applied.name'}
      `('correctly maps field $inputField', async ({ inputField, mappedField }) => {
        const query = await buildUnitedIndexQuery(soClient, {
          page: 1,
          pageSize: 10,
          sortField: inputField,
          sortDirection: 'asc',
        });

        expect(query.body.sort).toEqual([{ [mappedField]: 'asc' }]);
      });

      it('uses `unmapped_type`: `date` for last_seen field', async () => {
        const query = await buildUnitedIndexQuery(soClient, {
          page: 1,
          pageSize: 10,
          sortField: EndpointSortableField.LAST_SEEN,
          sortDirection: 'asc',
        });

        expect(query.body.sort).toEqual([
          { 'united.endpoint.@timestamp': { order: 'asc', unmapped_type: 'date' } },
        ]);
      });
    });
  });
});
