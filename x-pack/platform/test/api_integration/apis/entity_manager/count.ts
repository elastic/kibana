/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import expect from 'expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import {
  createEntityTypeDefinition,
  createEntitySourceDefinition,
  countEntities,
} from './helpers/request';
import { createIndexWithDocuments, createIndexWithEntities } from './helpers/data_generation';
import { clearEntityDefinitions } from './helpers/clear_entity_definitions';

export default function ({ getService }: FtrProviderContext) {
  const esClient = getService('es');
  const supertest = getService('supertest');

  describe('_count API', () => {
    let cleanup: Function[] = [];

    before(() => clearEntityDefinitions(esClient));

    afterEach(async () => {
      await Promise.all([clearEntityDefinitions(esClient), ...cleanup.map((fn) => fn())]);
      cleanup = [];
    });

    it('returns correct count for single source definition', async () => {
      const source = {
        id: 'source-1-with-services',
        type_id: '20-services',
        index_patterns: ['index-1-with-services'],
        identity_fields: ['service.name'],
        metadata_fields: [],
        filters: [],
        timestamp_field: 'custom_timestamp',
      };
      await createEntityTypeDefinition(supertest, {
        type: { id: '20-services', display_name: '20-services' },
      });
      await createEntitySourceDefinition(supertest, { source });

      cleanup.push(
        await createIndexWithEntities(esClient, {
          index: 'index-1-with-services',
          count: 20,
          source,
        })
      );

      const result = await countEntities(supertest, {}, 200);

      expect(result).toEqual({ total: 20, types: { '20-services': 20 }, errors: [] });
    });

    it('aggregates total count across types', async () => {
      const sourceType1 = {
        id: 'source-1-with-20-chumbles',
        type_id: 'chumble',
        index_patterns: ['index-1-with-chumbles'],
        identity_fields: ['service.name'],
        metadata_fields: [],
        filters: [],
        timestamp_field: 'custom_timestamp',
      };
      await createEntityTypeDefinition(supertest, {
        type: { id: 'chumble', display_name: 'chumble' },
      });
      await createEntitySourceDefinition(supertest, { source: sourceType1 });

      const sourceType2 = {
        id: 'source-1-with-15-shleems',
        type_id: 'shleem',
        index_patterns: ['index-1-with-shleems'],
        identity_fields: ['service.name'],
        metadata_fields: [],
        filters: [],
        timestamp_field: '@timestamp',
      };
      await createEntityTypeDefinition(supertest, {
        type: { id: 'shleem', display_name: 'shleem' },
      });
      await createEntitySourceDefinition(supertest, { source: sourceType2 });

      const sourceType3 = {
        id: 'source-1-with-25-shmuckles',
        type_id: 'shmuckle',
        index_patterns: ['index-1-with-shmuckles'],
        identity_fields: ['service.name'],
        metadata_fields: [],
        filters: [],
        timestamp_field: '@timestamp',
      };
      await createEntityTypeDefinition(supertest, {
        type: { id: 'shmuckle', display_name: 'shmuckle' },
      });
      await createEntitySourceDefinition(supertest, { source: sourceType3 });

      cleanup = await Promise.all([
        createIndexWithEntities(esClient, {
          index: 'index-1-with-chumbles',
          count: 20,
          source: sourceType1,
        }),
        createIndexWithEntities(esClient, {
          index: 'index-1-with-shleems',
          count: 15,
          source: sourceType2,
        }),
        createIndexWithEntities(esClient, {
          index: 'index-1-with-shmuckles',
          count: 25,
          source: sourceType3,
        }),
      ]);

      // counts all existing types
      let result = await countEntities(supertest, {}, 200);

      expect(result).toEqual({
        total: 60,
        types: {
          shleem: 15,
          chumble: 20,
          shmuckle: 25,
        },
        errors: [],
      });

      // only counts requested types
      result = await countEntities(supertest, { types: ['shleem', 'shmuckle'] }, 200);

      expect(result).toEqual({
        total: 40,
        types: {
          shleem: 15,
          shmuckle: 25,
        },
        errors: [],
      });
    });

    it('aggregates type count across sources', async () => {
      await createEntityTypeDefinition(supertest, { type: { id: 'fleeb', display_name: 'fleeb' } });
      await Promise.all([
        createEntitySourceDefinition(supertest, {
          source: {
            id: 'source-1-with-5-fleebs',
            type_id: 'fleeb',
            index_patterns: ['index-1-with-fleebs'],
            identity_fields: ['service.name'],
            metadata_fields: [],
            filters: [],
            timestamp_field: '@timestamp',
          },
        }),
        createEntitySourceDefinition(supertest, {
          source: {
            id: 'source-2-with-5-fleebs',
            type_id: 'fleeb',
            index_patterns: ['index-2-with-fleebs'],
            identity_fields: ['servicename_field'],
            metadata_fields: [],
            filters: [],
            timestamp_field: 'custom_timestamp',
          },
        }),
      ]);

      cleanup = await Promise.all([
        createIndexWithDocuments(esClient, {
          index: 'index-1-with-fleebs',
          properties: {
            '@timestamp': { type: 'date' },
            'service.name': { type: 'keyword' },
          },
          documents: [
            { '@timestamp': moment().toISOString(), 'service.name': 'service-one' },
            { '@timestamp': moment().toISOString(), 'service.name': 'service-two' },
            { '@timestamp': moment().toISOString(), 'service.name': 'service-three' },
            { '@timestamp': moment().toISOString(), 'service.name': 'service-four' },
            { '@timestamp': moment().toISOString(), 'service.name': 'service-five' },
          ],
        }),
        createIndexWithDocuments(esClient, {
          index: 'index-2-with-fleebs',
          properties: {
            custom_timestamp: { type: 'date' },
            servicename_field: { type: 'keyword' },
          },
          documents: [
            { custom_timestamp: moment().toISOString(), servicename_field: 'service-three' },
            { custom_timestamp: moment().toISOString(), servicename_field: 'service-four' },
            { custom_timestamp: moment().toISOString(), servicename_field: 'service-five' },
            { custom_timestamp: moment().toISOString(), servicename_field: 'service-six' },
            { custom_timestamp: moment().toISOString(), servicename_field: 'service-seven' },
          ],
        }),
      ]);

      const result = await countEntities(supertest, { types: ['fleeb'] }, 200);

      expect(result).toEqual({ total: 7, types: { fleeb: 7 }, errors: [] });
    });

    it('respects start and end parameters', async () => {
      const now = moment();

      await createEntityTypeDefinition(supertest, {
        type: { id: 'grumbo', display_name: 'grumbo' },
      });
      await createEntitySourceDefinition(supertest, {
        source: {
          id: 'source-1-with-grumbos',
          type_id: 'grumbo',
          index_patterns: ['index-1-with-grumbos'],
          identity_fields: ['service.name'],
          metadata_fields: [],
          filters: [],
          timestamp_field: '@timestamp',
        },
      });

      cleanup.push(
        await createIndexWithDocuments(esClient, {
          index: 'index-1-with-grumbos',
          properties: {
            '@timestamp': { type: 'date' },
            'service.name': { type: 'keyword' },
          },
          documents: [
            { '@timestamp': moment(now).toISOString(), 'service.name': 'service-one' },
            {
              '@timestamp': moment(now).subtract(10, 'minute').toISOString(),
              'service.name': 'service-two',
            },
            {
              '@timestamp': moment(now).subtract(20, 'minute').toISOString(),
              'service.name': 'service-three',
            },
            {
              '@timestamp': moment(now).subtract(30, 'minute').toISOString(),
              'service.name': 'service-four',
            },
            {
              '@timestamp': moment(now).subtract(30, 'minute').toISOString(),
              'service.name': 'service-five',
            },
          ],
        })
      );

      const result = await countEntities(
        supertest,
        {
          start: moment(now).subtract(25, 'minute').toISOString(),
          end: now.toISOString(),
        },
        200
      );

      expect(result).toEqual({ total: 3, types: { grumbo: 3 }, errors: [] });
    });

    it('respects filters parameters', async () => {
      const sourceType1 = {
        id: 'source-1-with-chumbles',
        type_id: 'chumble',
        index_patterns: ['index-1-with-chumbles'],
        identity_fields: ['service.name'],
        metadata_fields: [],
        filters: [],
      };
      await createEntityTypeDefinition(supertest, {
        type: { id: 'chumble', display_name: 'chumble' },
      });
      await createEntitySourceDefinition(supertest, { source: sourceType1 });

      const sourceType2 = {
        id: 'source-1-with-shleems',
        type_id: 'shleem',
        index_patterns: ['index-1-with-shleems'],
        identity_fields: ['service.name'],
        metadata_fields: [],
        filters: [],
      };
      await createEntityTypeDefinition(supertest, {
        type: { id: 'shleem', display_name: 'shleem' },
      });
      await createEntitySourceDefinition(supertest, { source: sourceType2 });

      const sourceType3 = {
        id: 'source-1-with-shmuckles',
        type_id: 'shmuckle',
        index_patterns: ['index-1-with-shmuckles'],
        identity_fields: ['service.name'],
        metadata_fields: [],
        filters: [],
      };
      await createEntityTypeDefinition(supertest, {
        type: { id: 'shmuckle', display_name: 'shmuckle' },
      });
      await createEntitySourceDefinition(supertest, { source: sourceType3 });

      cleanup = await Promise.all([
        createIndexWithDocuments(esClient, {
          index: 'index-1-with-chumbles',
          properties: {
            'service.name': { type: 'keyword' },
            'service.environment': { type: 'keyword' },
          },
          documents: [
            { 'service.name': 'service-one', 'service.environment': 'prod' },
            { 'service.name': 'service-one' },
          ],
        }),
        createIndexWithDocuments(esClient, {
          index: 'index-1-with-shleems',
          properties: {
            'service.name': { type: 'keyword' },
            'service.environment': { type: 'keyword' },
          },
          documents: [
            { 'service.name': 'service-two', 'service.environment': 'staging' },
            { 'service.name': 'service-three', 'service.environment': 'prod' },
            { 'service.name': 'service-three', 'service.environment': 'dev' },
          ],
        }),
        createIndexWithDocuments(esClient, {
          index: 'index-1-with-shmuckles',
          properties: {
            'service.name': { type: 'keyword' },
          },
          documents: [
            { 'service.name': 'service-two' },
            { 'service.name': 'service-three' },
            { 'service.name': 'service-three' },
          ],
        }),
      ]);

      const result = await countEntities(
        supertest,
        { filters: ['service.environment: prod'] },
        200
      );

      expect(result).toEqual({
        total: 2,
        types: {
          chumble: 1,
          shleem: 1,
          shmuckle: 0,
        },
        errors: [],
      });
    });

    it('is resilient to partially valid sources', async () => {
      await createEntityTypeDefinition(supertest, {
        type: { id: 'chumble', display_name: 'chumble' },
      });
      await Promise.all([
        createEntitySourceDefinition(supertest, {
          source: {
            id: 'source-with-chumbles',
            type_id: 'chumble',
            index_patterns: ['index-1-with-chumbles'],
            identity_fields: ['service.name'],
            metadata_fields: [],
            filters: [],
          },
        }),
        createEntitySourceDefinition(supertest, {
          source: {
            id: 'invalid-source-with-chumbles',
            type_id: 'chumble',
            index_patterns: ['index-2-with-chumbles'],
            identity_fields: ['service.name'],
            metadata_fields: [],
            filters: [],
          },
        }),
      ]);

      cleanup = await Promise.all([
        createIndexWithDocuments(esClient, {
          index: 'index-1-with-chumbles',
          properties: {
            'service.name': { type: 'keyword' },
          },
          documents: [{ 'service.name': 'service-one' }],
        }),
        createIndexWithDocuments(esClient, {
          index: 'index-2-with-chumbles',
          properties: {
            'service.environment': { type: 'keyword' },
          },
          documents: [{ 'service.name': 'service-two' }],
        }),
      ]);

      const result = await countEntities(supertest, {}, 200);

      expect(result).toEqual({
        total: 1,
        types: {
          chumble: 1,
        },
        errors: [
          'Mandatory fields [service.name] are not mapped for source [source: invalid-source-with-chumbles, type: chumble] with index patterns [index-2-with-chumbles]',
        ],
      });
    });

    it('is resilient to no valid sources', async () => {
      await createEntityTypeDefinition(supertest, {
        type: { id: 'chumble', display_name: 'chumble' },
      });
      await Promise.all([
        createEntitySourceDefinition(supertest, {
          source: {
            id: 'source1-with-chumbles',
            type_id: 'chumble',
            index_patterns: ['index-1-with-chumbles'],
            identity_fields: ['service.name'],
            metadata_fields: [],
            filters: [],
          },
        }),
        createEntitySourceDefinition(supertest, {
          source: {
            id: 'source2-with-chumbles',
            type_id: 'chumble',
            index_patterns: ['index-2-with-chumbles'],
            identity_fields: ['service.name'],
            metadata_fields: [],
            filters: [],
          },
        }),
      ]);

      const result = await countEntities(supertest, {}, 200);

      expect(result).toEqual({
        total: 0,
        types: {
          chumble: 0,
        },
        errors: expect.arrayContaining([
          'No index found for source [source: source1-with-chumbles, type: chumble] with index patterns [index-1-with-chumbles]',
          'No index found for source [source: source2-with-chumbles, type: chumble] with index patterns [index-2-with-chumbles]',
        ]),
      });
    });
  });
}
