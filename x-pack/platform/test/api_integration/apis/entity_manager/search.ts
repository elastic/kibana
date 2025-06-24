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
  createEntitySourceDefinition,
  createEntityTypeDefinition,
  searchEntities,
} from './helpers/request';
import { createIndexWithDocuments } from './helpers/data_generation';
import { clearEntityDefinitions } from './helpers/clear_entity_definitions';

export default function ({ getService }: FtrProviderContext) {
  const esClient = getService('es');
  const supertest = getService('supertest');

  describe('_search API', () => {
    let cleanup: Function[] = [];

    before(() => clearEntityDefinitions(esClient));

    afterEach(async () => {
      await Promise.all([clearEntityDefinitions(esClient), ...cleanup.map((fn) => fn())]);
      cleanup = [];
    });

    it('returns 404 when no matching sources', async () => {
      await searchEntities(supertest, { type: 'undefined-type' }, 404);
    });

    it('resolves entities from sources with timestamp', async () => {
      const now = moment();

      cleanup.push(
        await createIndexWithDocuments(esClient, {
          index: 'index-1-with-services',
          properties: {
            custom_timestamp: { type: 'date' },
            'service.name': { type: 'keyword' },
          },
          documents: [
            {
              custom_timestamp: moment(now).subtract(1, 'minute').toISOString(),
              'service.name': 'service-one',
            },
            {
              custom_timestamp: moment(now).subtract(2, 'minute').toISOString(),
              'service.name': 'service-two',
            },
            {
              custom_timestamp: moment(now).subtract(1, 'hour').toISOString(),
              'service.name': 'service-three',
            },
          ],
        })
      );

      await createEntityTypeDefinition(supertest, {
        type: { id: 'services-with-timestamp', display_name: 'services-with-timestamp' },
      });
      await createEntitySourceDefinition(supertest, {
        source: {
          id: 'source-1-with-services',
          type_id: 'services-with-timestamp',
          index_patterns: ['index-1-with-services'],
          identity_fields: ['service.name'],
          metadata_fields: [],
          filters: [],
          timestamp_field: 'custom_timestamp',
        },
      });

      const { entities, errors } = await searchEntities(supertest, {
        type: 'services-with-timestamp',
        start: moment(now).subtract(10, 'minute').toISOString(),
        end: now.toISOString(),
      });

      expect(errors).toEqual([]);
      expect(entities).toEqual([
        {
          'entity.last_seen_timestamp': moment(now).subtract(1, 'minute').toISOString(),
          'entity.id': 'service-one',
          'entity.display_name': 'service-one',
          'entity.type': 'services-with-timestamp',
          'service.name': 'service-one',
        },
        {
          'entity.last_seen_timestamp': moment(now).subtract(2, 'minute').toISOString(),
          'entity.id': 'service-two',
          'entity.display_name': 'service-two',
          'entity.type': 'services-with-timestamp',
          'service.name': 'service-two',
        },
      ]);
    });

    it('resolves entities from sources without timestamp', async () => {
      cleanup.push(
        await createIndexWithDocuments(esClient, {
          index: 'index-1-with-home-appliances',
          properties: { 'appliance.name': { type: 'keyword' } },
          documents: [
            { 'appliance.name': 'rice cooker' },
            { 'appliance.name': 'kettle' },
            { 'appliance.name': 'dishwasher' },
          ],
        })
      );

      await createEntityTypeDefinition(supertest, {
        type: { id: 'home-appliances', display_name: 'home-appliances' },
      });
      await createEntitySourceDefinition(supertest, {
        source: {
          id: 'appliances-no-timestamp',
          type_id: 'home-appliances',
          index_patterns: ['index-1-with-home-appliances'],
          identity_fields: ['appliance.name'],
          metadata_fields: [],
          filters: [],
        },
      });

      const { entities, errors } = await searchEntities(supertest, {
        type: 'home-appliances',
      });

      expect(errors).toEqual([]);
      expect(entities).toEqual([
        {
          'entity.id': 'dishwasher',
          'entity.display_name': 'dishwasher',
          'entity.type': 'home-appliances',
          'appliance.name': 'dishwasher',
        },
        {
          'entity.id': 'kettle',
          'entity.display_name': 'kettle',
          'entity.type': 'home-appliances',
          'appliance.name': 'kettle',
        },
        {
          'entity.id': 'rice cooker',
          'entity.display_name': 'rice cooker',
          'entity.type': 'home-appliances',
          'appliance.name': 'rice cooker',
        },
      ]);
    });

    it('merges entities from different sources', async () => {
      const now = moment();

      cleanup = await Promise.all([
        createIndexWithDocuments(esClient, {
          index: 'index-1-with-hosts',
          properties: {
            '@timestamp': { type: 'date' },
            'host.name': { type: 'keyword' },
            'agent.name': { type: 'keyword' },
          },
          documents: [
            {
              '@timestamp': moment(now).subtract(1, 'minute').toISOString(),
              'host.name': 'host-uno',
              'agent.name': 'agent-a',
            },
            {
              '@timestamp': moment(now).subtract(3, 'minute').toISOString(),
              'host.name': 'host-uno',
              'agent.name': 'agent-b',
            },
            {
              '@timestamp': moment(now).subtract(3, 'minute').toISOString(),
              'host.name': 'host-dos',
              'agent.name': 'agent-3',
            },
            {
              '@timestamp': moment(now).subtract(4, 'minute').toISOString(),
              'host.name': 'host-tres',
            },
          ],
        }),

        createIndexWithDocuments(esClient, {
          index: 'index-2-with-hosts',
          properties: {
            timestamp: { type: 'date' },
            hostname_field: { type: 'keyword' },
            'agent.name': { type: 'keyword' },
          },
          documents: [
            {
              timestamp: moment(now).subtract(2, 'minute').toISOString(),
              hostname_field: 'host-uno',
              'agent.name': 'agent-1',
            },
            {
              timestamp: moment(now).subtract(2, 'minute').toISOString(),
              hostname_field: 'host-dos',
              'agent.name': 'agent-k',
            },
            {
              timestamp: moment(now).subtract(5, 'minute').toISOString(),
              hostname_field: 'host-four',
            },
          ],
        }),
      ]);

      await createEntityTypeDefinition(supertest, {
        type: { id: 'hosts-with-agents', display_name: 'hosts-with-agents' },
      });
      await Promise.all([
        createEntitySourceDefinition(supertest, {
          source: {
            id: 'hosts-with-agents-1',
            type_id: 'hosts-with-agents',
            index_patterns: ['index-1-with-hosts'],
            identity_fields: ['host.name'],
            metadata_fields: [],
            filters: [],
            timestamp_field: '@timestamp',
          },
        }),
        createEntitySourceDefinition(supertest, {
          source: {
            id: 'hosts-with-agents-2',
            type_id: 'hosts-with-agents',
            index_patterns: ['index-2-with-hosts'],
            identity_fields: ['hostname_field'],
            metadata_fields: [],
            filters: [],
            timestamp_field: 'timestamp',
          },
        }),
      ]);

      const { entities, errors } = await searchEntities(supertest, {
        type: 'hosts-with-agents',
        start: moment(now).subtract(10, 'minute').toISOString(),
        end: moment(now).toISOString(),
        metadata_fields: ['agent.name'],
      });

      expect(errors).toEqual([]);
      expect(entities).toEqual([
        {
          'entity.id': 'host-uno',
          'entity.display_name': 'host-uno',
          'entity.type': 'hosts-with-agents',
          'entity.last_seen_timestamp': moment(now).subtract(1, 'minute').toISOString(),
          'host.name': 'host-uno',
          hostname_field: 'host-uno',
          'agent.name': expect.arrayContaining(['agent-a', 'agent-b', 'agent-1']),
        },
        {
          'entity.id': 'host-dos',
          'entity.display_name': 'host-dos',
          'entity.type': 'hosts-with-agents',
          'entity.last_seen_timestamp': moment(now).subtract(2, 'minute').toISOString(),
          'host.name': 'host-dos',
          hostname_field: 'host-dos',
          'agent.name': expect.arrayContaining(['agent-3', 'agent-k']),
        },
        {
          'entity.id': 'host-tres',
          'entity.display_name': 'host-tres',
          'entity.type': 'hosts-with-agents',
          'entity.last_seen_timestamp': moment(now).subtract(4, 'minute').toISOString(),
          'host.name': 'host-tres',
          'agent.name': null,
        },
        {
          'entity.id': 'host-four',
          'entity.display_name': 'host-four',
          'entity.type': 'hosts-with-agents',
          'entity.last_seen_timestamp': moment(now).subtract(5, 'minute').toISOString(),
          hostname_field: 'host-four',
          'agent.name': null,
        },
      ]);
    });

    it('includes source and additional metadata fields', async () => {
      const now = moment();

      cleanup = await Promise.all([
        createIndexWithDocuments(esClient, {
          index: 'index-1-with-services',
          properties: {
            '@timestamp': { type: 'date' },
            'service.name': { type: 'keyword' },
            'agent.name': { type: 'keyword' },
            'host.name': { type: 'keyword' },
          },
          documents: [
            {
              '@timestamp': moment(now).subtract(1, 'minute').toISOString(),
              'service.name': 'service-one',
              'agent.name': 'agent-one',
              'host.name': 'host-one',
            },
            {
              '@timestamp': moment(now).subtract(2, 'minute').toISOString(),
              'service.name': 'service-one',
              'agent.name': 'agent-one',
              'host.name': 'host-one',
            },
            {
              '@timestamp': moment(now).subtract(2, 'minute').toISOString(),
              'service.name': 'service-one',
              'host.name': 'host-two',
            },
            {
              '@timestamp': moment(now).subtract(3, 'minute').toISOString(),
              'service.name': 'service-two',
              'host.name': 'host-three',
            },
          ],
        }),

        createIndexWithDocuments(esClient, {
          index: 'index-2-with-services',
          properties: {
            '@timestamp': { type: 'date' },
            'service.name': { type: 'keyword' },
            'agent.name': { type: 'keyword' },
            'host.name': { type: 'keyword' },
          },
          documents: [
            {
              '@timestamp': moment(now).subtract(1, 'minute').toISOString(),
              'service.name': 'service-one',
              'agent.name': 'agent-one',
              'host.name': 'host-one',
            },
            {
              '@timestamp': moment(now).subtract(2, 'minute').toISOString(),
              'service.name': 'service-one',
              'agent.name': 'agent-ten',
              'host.name': 'host-ten',
            },
            {
              '@timestamp': moment(now).subtract(2, 'minute').toISOString(),
              'service.name': 'service-two',
              'agent.name': 'agent-nine',
              'host.name': 'host-nine',
            },
          ],
        }),
      ]);

      await createEntityTypeDefinition(supertest, {
        type: { id: 'services-with-hosts', display_name: 'services-with-hosts' },
      });
      await Promise.all([
        createEntitySourceDefinition(supertest, {
          source: {
            id: 'source-1-with-services',
            type_id: 'services-with-hosts',
            index_patterns: ['index-1-with-services'],
            identity_fields: ['service.name'],
            metadata_fields: ['host.name'],
            filters: [],
            timestamp_field: '@timestamp',
          },
        }),
        createEntitySourceDefinition(supertest, {
          source: {
            id: 'source-2-with-services',
            type_id: 'services-with-hosts',
            index_patterns: ['index-2-with-services'],
            identity_fields: ['service.name'],
            metadata_fields: ['host.name'],
            filters: [],
            timestamp_field: '@timestamp',
          },
        }),
      ]);

      const { entities, errors } = await searchEntities(supertest, {
        type: 'services-with-hosts',
        metadata_fields: ['agent.name', 'non.existing.metadata.field'],
        start: moment(now).subtract(5, 'minute').toISOString(),
        end: moment(now).toISOString(),
      });

      expect(errors).toEqual([]);
      expect(entities).toEqual([
        {
          'entity.last_seen_timestamp': moment(now).subtract(1, 'minute').toISOString(),
          'entity.id': 'service-one',
          'entity.display_name': 'service-one',
          'entity.type': 'services-with-hosts',
          'service.name': 'service-one',
          'agent.name': expect.arrayContaining(['agent-one', 'agent-ten']),
          'host.name': expect.arrayContaining(['host-one', 'host-two', 'host-ten']),
        },
        {
          'entity.last_seen_timestamp': moment(now).subtract(2, 'minute').toISOString(),
          'entity.id': 'service-two',
          'entity.display_name': 'service-two',
          'entity.type': 'services-with-hosts',
          'service.name': 'service-two',
          'agent.name': 'agent-nine',
          'host.name': expect.arrayContaining(['host-three', 'host-nine']),
        },
      ]);
    });

    it('respects filters', async () => {
      const now = moment();

      cleanup.push(
        await createIndexWithDocuments(esClient, {
          index: 'index-1-with-services',
          properties: {
            '@timestamp': { type: 'date' },
            'service.name': { type: 'keyword' },
            'service.environment': { type: 'keyword' },
            'service.url': { type: 'keyword' },
          },
          documents: [
            {
              '@timestamp': moment(now).subtract(1, 'minute').toISOString(),
              'service.name': 'service-one',
              'service.environment': 'prod',
              'service.url': 'http://prod.service-one.com',
            },
            {
              '@timestamp': moment(now).subtract(2, 'minute').toISOString(),
              'service.name': 'service-one',
              'service.environment': 'staging',
              'service.url': 'http://staging.service-one.com',
            },
            {
              '@timestamp': moment(now).subtract(2, 'minute').toISOString(),
              'service.name': 'service-two',
              'service.environment': 'prod',
              'service.url': 'http://prod.service-two.com',
            },
            {
              '@timestamp': moment(now).subtract(1, 'minute').toISOString(),
              'service.name': 'service-two',
              'service.environment': 'staging',
              'service.url': 'http://staging.service-two.com',
            },
            {
              '@timestamp': moment(now).subtract(1, 'minute').toISOString(),
              'service.name': 'service-three',
              'service.environment': 'prod',
              'service.url': 'http://prod.service-three.com',
            },
          ],
        })
      );

      await createEntityTypeDefinition(supertest, {
        type: { id: 'service-one-type', display_name: 'service-one-type' },
      });
      await createEntitySourceDefinition(supertest, {
        source: {
          id: 'source-1-with-services',
          type_id: 'service-one-type',
          index_patterns: ['index-1-with-services'],
          identity_fields: ['service.name'],
          metadata_fields: [],
          filters: ['service.name: service-one'],
          timestamp_field: '@timestamp',
        },
      });

      const { entities, errors } = await searchEntities(supertest, {
        type: 'service-one-type',
        start: moment(now).subtract(5, 'minute').toISOString(),
        end: moment(now).toISOString(),
        filters: ['service.environment: prod'],
        metadata_fields: ['service.environment', 'service.url'],
      });

      expect(errors).toEqual([]);
      expect(entities).toEqual([
        {
          'entity.last_seen_timestamp': moment(now).subtract(1, 'minute').toISOString(),
          'entity.id': 'service-one',
          'entity.display_name': 'service-one',
          'entity.type': 'service-one-type',
          'service.name': 'service-one',
          'service.environment': 'prod',
          'service.url': 'http://prod.service-one.com',
        },
      ]);
    });

    it('resolves entities with multiple identity fields', async () => {
      const now = moment();

      cleanup.push(
        await createIndexWithDocuments(esClient, {
          index: 'index-1-with-cars',
          properties: {
            '@timestamp': { type: 'date' },
            'car.brand': { type: 'keyword' },
            'car.model': { type: 'keyword' },
          },
          documents: [
            {
              '@timestamp': moment(now).subtract(2, 'minute').toISOString(),
              'car.brand': 'Fiat',
              'car.model': 'Multipla',
            },
            {
              '@timestamp': moment(now).subtract(1, 'minute').toISOString(),
              'car.brand': 'Citroen',
              'car.model': 'ZX break',
            },
          ],
        })
      );

      await createEntityTypeDefinition(supertest, {
        type: { id: 'most-refined-cars', display_name: 'most-refined-cars' },
      });
      await createEntitySourceDefinition(supertest, {
        source: {
          id: 'source-1-with-cars',
          type_id: 'most-refined-cars',
          index_patterns: ['index-1-with-cars'],
          identity_fields: ['car.brand', 'car.model'],
          metadata_fields: [],
          filters: [],
          timestamp_field: '@timestamp',
          display_name: 'car.model',
        },
      });

      const { entities, errors } = await searchEntities(supertest, {
        type: 'most-refined-cars',
        start: moment(now).subtract(5, 'minute').toISOString(),
        end: moment(now).toISOString(),
      });

      expect(errors).toEqual([]);
      expect(entities).toEqual([
        {
          'entity.last_seen_timestamp': moment(now).subtract(1, 'minute').toISOString(),
          'entity.id': 'Citroen:ZX break',
          'entity.display_name': 'ZX break',
          'entity.type': 'most-refined-cars',
          'car.brand': 'Citroen',
          'car.model': 'ZX break',
        },
        {
          'entity.last_seen_timestamp': moment(now).subtract(2, 'minute').toISOString(),
          'entity.id': 'Fiat:Multipla',
          'entity.display_name': 'Multipla',
          'entity.type': 'most-refined-cars',
          'car.brand': 'Fiat',
          'car.model': 'Multipla',
        },
      ]);
    });

    it('resolves entities with multiple identity fields across sources', async () => {
      const now = moment();

      cleanup = await Promise.all([
        createIndexWithDocuments(esClient, {
          index: 'index-1-with-cars',
          properties: {
            '@timestamp': { type: 'date' },
            'car.brand': { type: 'keyword' },
            'car.model': { type: 'keyword' },
            'car.color': { type: 'keyword' },
          },
          documents: [
            {
              '@timestamp': moment(now).subtract(2, 'minute').toISOString(),
              'car.brand': 'Fiat',
              'car.model': 'Multipla',
              'car.color': 'cyan',
            },
            {
              '@timestamp': moment(now).subtract(1, 'minute').toISOString(),
              'car.brand': 'Citroen',
              'car.model': 'ZX break',
              'car.color': 'white',
            },
          ],
        }),

        createIndexWithDocuments(esClient, {
          index: 'index-2-with-cars',
          properties: {
            '@timestamp': { type: 'date' },
            car_brand: { type: 'keyword' },
            car_model: { type: 'keyword' },
            'car.color': { type: 'keyword' },
          },
          documents: [
            {
              '@timestamp': moment(now).subtract(2, 'minute').toISOString(),
              car_brand: 'Fiat',
              car_model: 'Multipla',
              'car.color': 'purple',
            },
            {
              '@timestamp': moment(now).subtract(1, 'minute').toISOString(),
              car_brand: 'Citroen',
              car_model: 'ZX break',
              'car.color': 'orange',
            },
          ],
        }),
      ]);

      await createEntityTypeDefinition(supertest, {
        type: { id: 'most-refined-cars', display_name: 'most-refined-cars' },
      });
      await Promise.all([
        createEntitySourceDefinition(supertest, {
          source: {
            id: 'source-1-with-cars',
            type_id: 'most-refined-cars',
            index_patterns: ['index-1-with-cars'],
            identity_fields: ['car.brand', 'car.model'],
            metadata_fields: [],
            filters: [],
            timestamp_field: '@timestamp',
          },
        }),
        createEntitySourceDefinition(supertest, {
          source: {
            id: 'source-2-with-cars',
            type_id: 'most-refined-cars',
            index_patterns: ['index-2-with-cars'],
            identity_fields: ['car_brand', 'car_model'],
            metadata_fields: [],
            filters: [],
            timestamp_field: '@timestamp',
          },
        }),
      ]);

      const { entities, errors } = await searchEntities(supertest, {
        type: 'most-refined-cars',
        start: moment(now).subtract(5, 'minute').toISOString(),
        end: moment(now).toISOString(),
        metadata_fields: ['car.color'],
      });

      expect(errors).toEqual([]);
      expect(entities).toEqual([
        {
          'entity.last_seen_timestamp': moment(now).subtract(1, 'minute').toISOString(),
          'entity.id': 'Citroen:ZX break',
          'entity.display_name': 'Citroen:ZX break',
          'entity.type': 'most-refined-cars',
          'car.brand': 'Citroen',
          'car.model': 'ZX break',
          car_brand: 'Citroen',
          car_model: 'ZX break',
          'car.color': expect.arrayContaining(['white', 'orange']),
        },
        {
          'entity.last_seen_timestamp': moment(now).subtract(2, 'minute').toISOString(),
          'entity.id': 'Fiat:Multipla',
          'entity.display_name': 'Fiat:Multipla',
          'entity.type': 'most-refined-cars',
          'car.brand': 'Fiat',
          'car.model': 'Multipla',
          car_brand: 'Fiat',
          car_model: 'Multipla',
          'car.color': expect.arrayContaining(['cyan', 'purple']),
        },
      ]);
    });

    it('casts conflicting mappings to keywords', async () => {
      cleanup = await Promise.all([
        await createIndexWithDocuments(esClient, {
          index: 'index-service-name-as-keyword',
          properties: { 'service.name': { type: 'keyword' } },
          documents: [{ 'service.name': 'service-name-as-keyword' }],
        }),

        await createIndexWithDocuments(esClient, {
          index: 'index-service-name-as-text',
          properties: { 'service.name': { type: 'text' } },
          documents: [{ 'service.name': 'service-name-as-text' }],
        }),

        await createIndexWithDocuments(esClient, {
          index: 'index-service-name-as-long',
          properties: { 'service.name': { type: 'long' } },
          documents: [{ 'service.name': 123 }],
        }),
      ]);

      await createEntityTypeDefinition(supertest, {
        type: {
          id: 'type-with-conflicting-mappings',
          display_name: 'type-with-conflicting-mappings',
        },
      });
      await createEntitySourceDefinition(supertest, {
        source: {
          id: 'conflicting-mappings',
          type_id: 'type-with-conflicting-mappings',
          index_patterns: ['index-service-name-as-*'],
          identity_fields: ['service.name'],
          metadata_fields: [],
          filters: [],
        },
      });

      const { entities, errors } = await searchEntities(supertest, {
        type: 'type-with-conflicting-mappings',
      });

      expect(errors).toEqual([]);
      expect(entities).toEqual([
        {
          'entity.id': '123',
          'entity.display_name': '123',
          'entity.type': 'type-with-conflicting-mappings',
          'service.name': '123',
        },
        {
          'entity.id': 'service-name-as-keyword',
          'entity.display_name': 'service-name-as-keyword',
          'entity.type': 'type-with-conflicting-mappings',
          'service.name': 'service-name-as-keyword',
        },
        {
          'entity.id': 'service-name-as-text',
          'entity.display_name': 'service-name-as-text',
          'entity.type': 'type-with-conflicting-mappings',
          'service.name': 'service-name-as-text',
        },
      ]);
    });

    it('returns error if index does not exist', async () => {
      await createEntityTypeDefinition(supertest, {
        type: { id: 'type-with-non-existing-index', display_name: 'type-with-non-existing-index' },
      });
      await createEntitySourceDefinition(supertest, {
        source: {
          id: 'non-existing-index',
          type_id: 'type-with-non-existing-index',
          index_patterns: ['non-existing-index-pattern*', 'non-existing-index'],
          identity_fields: ['service.name'],
          metadata_fields: [],
          filters: [],
          timestamp_field: '@timestamp',
        },
      });

      const { entities, errors } = await searchEntities(supertest, {
        type: 'type-with-non-existing-index',
      });
      expect(errors).toEqual([
        'No index found for source [source: non-existing-index, type: type-with-non-existing-index] with index patterns [non-existing-index-pattern*, non-existing-index]',
      ]);
      expect(entities).toEqual([]);
    });

    it('returns error if mandatory fields are not mapped', async () => {
      cleanup.push(
        await createIndexWithDocuments(esClient, {
          index: 'unmapped-id-fields',
          properties: { 'service.environment': { type: 'keyword' } },
          documents: [
            {
              '@timestamp': moment().toISOString(),
              'service.name': 'service-one',
              'service.environment': 'prod',
            },
          ],
        })
      );

      await createEntityTypeDefinition(supertest, {
        type: { id: 'type-with-unmapped-id-fields', display_name: 'type-with-unmapped-id-fields' },
      });
      await createEntitySourceDefinition(supertest, {
        source: {
          id: 'unmapped-fields',
          type_id: 'type-with-unmapped-id-fields',
          index_patterns: ['unmapped-id-fields'],
          identity_fields: ['service.name', 'service.environment'],
          metadata_fields: [],
          filters: [],
          timestamp_field: '@timestamp',
        },
      });

      const { entities, errors } = await searchEntities(supertest, {
        type: 'type-with-unmapped-id-fields',
      });
      expect(errors).toEqual([
        'Mandatory fields [service.name, @timestamp] are not mapped for source [source: unmapped-fields, type: type-with-unmapped-id-fields] with index patterns [unmapped-id-fields]',
      ]);
      expect(entities).toEqual([]);
    });
  });
}
