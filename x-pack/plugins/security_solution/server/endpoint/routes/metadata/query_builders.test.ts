/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  kibanaRequestToMetadataListESQuery,
  getESQueryHostMetadataByID,
  buildUnitedIndexQuery,
} from './query_builders';
import { metadataCurrentIndexPattern } from '../../../../common/endpoint/constants';
import { get } from 'lodash';
import { expectedCompleteUnitedIndexQuery } from './query_builders.fixtures';

describe('query builder', () => {
  describe('MetadataListESQuery', () => {
    it('queries the correct index', async () => {
      const query = await kibanaRequestToMetadataListESQuery({
        page: 0,
        pageSize: 10,
        kuery: '',
        unenrolledAgentIds: [],
        statusAgentIds: [],
      });
      expect(query.index).toEqual(metadataCurrentIndexPattern);
    });

    it('sorts using *event.created', async () => {
      const query = await kibanaRequestToMetadataListESQuery({
        page: 0,
        pageSize: 10,
        kuery: '',
        unenrolledAgentIds: [],
        statusAgentIds: [],
      });
      expect(query.body.sort).toContainEqual({
        'event.created': {
          order: 'desc',
          unmapped_type: 'date',
        },
      });
      expect(query.body.sort).toContainEqual({
        'HostDetails.event.created': {
          order: 'desc',
          unmapped_type: 'date',
        },
      });
    });

    it('excludes unenrolled elastic agents when they exist, by default', async () => {
      const unenrolledElasticAgentId = '1fdca33f-799f-49f4-939c-ea4383c77672';
      const query = await kibanaRequestToMetadataListESQuery({
        page: 0,
        pageSize: 10,
        kuery: '',
        unenrolledAgentIds: [unenrolledElasticAgentId],
        statusAgentIds: [],
      });

      expect(query.body.query).toEqual({
        bool: {
          must_not: [
            {
              terms: {
                'elastic.agent.id': [
                  '00000000-0000-0000-0000-000000000000',
                  '11111111-1111-1111-1111-111111111111',
                  unenrolledElasticAgentId,
                ],
              },
            },
            {
              terms: {
                'HostDetails.elastic.agent.id': [
                  '00000000-0000-0000-0000-000000000000',
                  '11111111-1111-1111-1111-111111111111',
                  unenrolledElasticAgentId,
                ],
              },
            },
          ],
        },
      });
    });
  });

  describe('test query builder with kql filter', () => {
    it('test default query params for all endpoints metadata when body filter is provided', async () => {
      const query = await kibanaRequestToMetadataListESQuery({
        page: 0,
        pageSize: 10,
        kuery: 'not host.ip:10.140.73.246',
        unenrolledAgentIds: [],
        statusAgentIds: [],
      });

      expect(query.body.query.bool.must).toContainEqual({
        bool: {
          must_not: {
            bool: {
              should: [
                {
                  match: {
                    'host.ip': '10.140.73.246',
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        },
      });
    });

    it(
      'test default query params for all endpoints endpoint metadata excluding unerolled endpoint ' +
        'and when body filter is provided',
      async () => {
        const unenrolledElasticAgentId = '1fdca33f-799f-49f4-939c-ea4383c77672';
        const query = await kibanaRequestToMetadataListESQuery({
          page: 0,
          pageSize: 10,
          kuery: 'not host.ip:10.140.73.246',
          unenrolledAgentIds: [unenrolledElasticAgentId],
          statusAgentIds: [],
        });

        expect(query.body.query.bool.must).toEqual([
          {
            bool: {
              must_not: [
                {
                  terms: {
                    'elastic.agent.id': [
                      '00000000-0000-0000-0000-000000000000',
                      '11111111-1111-1111-1111-111111111111',
                      '1fdca33f-799f-49f4-939c-ea4383c77672',
                    ],
                  },
                },
                {
                  terms: {
                    'HostDetails.elastic.agent.id': [
                      '00000000-0000-0000-0000-000000000000',
                      '11111111-1111-1111-1111-111111111111',
                      '1fdca33f-799f-49f4-939c-ea4383c77672',
                    ],
                  },
                },
              ],
            },
          },
          {
            bool: {
              must_not: {
                bool: {
                  minimum_should_match: 1,
                  should: [{ match: { 'host.ip': '10.140.73.246' } }],
                },
              },
            },
          },
        ]);
      }
    );
  });

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
      const query = await buildUnitedIndexQuery(
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
      const query = await buildUnitedIndexQuery(
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
  });
});
