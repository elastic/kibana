/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { emptyAssets, type RoutingStatus } from '@kbn/streams-schema';
import { disableStreams, enableStreams, forkStream, indexDocument } from './helpers/requests';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const esClient = getService('es');

  let apiClient: StreamsSupertestRepositoryClient;

  describe('Streams Schema', () => {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);

      const doc = {
        '@timestamp': '2024-01-01T00:00:10.000Z',
        message: '2023-01-01T00:00:10.000Z error test',
        ['some.field']: 'some value',
        ['another.field']: 'another value',
        lastField: 'last value',
        ['log.level']: 'warning',
      };

      await indexDocument(esClient, 'logs', doc);
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    describe('Unmapped fields API', () => {
      it('Returns unmapped fields', async () => {
        const response = await apiClient
          .fetch('GET /internal/streams/{name}/schema/unmapped_fields', {
            params: {
              path: {
                name: 'logs',
              },
            },
          })
          .expect(200);
        expect(response.body.unmappedFields).to.eql([
          'attributes.another.field',
          'attributes.lastField',
          'attributes.some.field',
        ]);
      });

      describe('Geo point subfield filtering', () => {
        const CLASSIC_STREAM_NAME = 'logs-geoschema-default';

        before(async () => {
          await indexDocument(esClient, CLASSIC_STREAM_NAME, {
            '@timestamp': '2024-01-01T00:00:20.000Z',
            'location.lat': 40.7128,
            'location.lon': -74.006,
            'other.field': 'value',
          });

          await apiClient
            .fetch('PUT /api/streams/{name} 2023-10-31', {
              params: {
                path: { name: CLASSIC_STREAM_NAME },
                body: {
                  ...emptyAssets,
                  stream: {
                    description: '',
                    ingest: {
                      lifecycle: { inherit: {} },
                      processing: { steps: [] },
                      settings: {},
                      classic: {
                        field_overrides: {
                          location: { type: 'geo_point' },
                        },
                      },
                      failure_store: { inherit: {} },
                    },
                  },
                },
              },
            })
            .expect(200);
        });

        after(async () => {
          await esClient.indices.deleteDataStream({ name: CLASSIC_STREAM_NAME });
        });

        it('hides .lat/.lon subfields when parent is mapped as geo_point', async () => {
          const response = await apiClient
            .fetch('GET /internal/streams/{name}/schema/unmapped_fields', {
              params: {
                path: { name: CLASSIC_STREAM_NAME },
              },
            })
            .expect(200);

          // Regular unmapped fields should still be returned
          expect(response.body.unmappedFields).to.contain('other.field');

          // .lat/.lon subfields should be hidden when parent is geo_point
          expect(response.body.unmappedFields).not.to.contain('location.lat');
          expect(response.body.unmappedFields).not.to.contain('location.lon');
        });
      });
    });

    describe('Fields simulation API', () => {
      it('Returns failure status when simulation would fail', async () => {
        const response = await apiClient.fetch(
          'POST /internal/streams/{name}/schema/fields_simulation',
          {
            params: {
              path: {
                name: 'logs',
              },
              body: {
                field_definitions: [{ name: 'body.text', type: 'boolean' }],
              },
            },
          }
        );

        expect(response.body.status).to.be('failure');
        expect(response.body.simulationError).to.be.a('string');
        expect(response.body.documentsWithRuntimeFieldsApplied).to.be(null);
      });
      it('Returns success status when simulation would succeed', async () => {
        const response = await apiClient.fetch(
          'POST /internal/streams/{name}/schema/fields_simulation',
          {
            params: {
              path: {
                name: 'logs',
              },
              body: {
                field_definitions: [{ name: 'body.text', type: 'keyword' }],
              },
            },
          }
        );

        expect(response.body.status).to.be('success');
        expect(response.body.simulationError).to.be(null);
        expect(response.body.documentsWithRuntimeFieldsApplied).length(1);
      });
      it('Returns unknown status when documents are missing and status cannot be determined', async () => {
        const forkBody = {
          stream: {
            name: 'logs.nginx',
          },
          where: {
            field: 'attributes.log.logger',
            eq: 'nginx',
          },
          status: 'enabled' as RoutingStatus,
        };

        await forkStream(apiClient, 'logs', forkBody);
        const response = await apiClient.fetch(
          'POST /internal/streams/{name}/schema/fields_simulation',
          {
            params: {
              path: {
                name: 'logs.nginx',
              },
              body: {
                field_definitions: [{ name: 'body.text', type: 'keyword' }],
              },
            },
          }
        );

        expect(response.body.status).to.be('unknown');
        expect(response.body.simulationError).to.be(null);
        expect(response.body.documentsWithRuntimeFieldsApplied).to.be(null);
      });

      describe('Geo point fields', () => {
        before(async () => {
          // Flattened lat/lon
          await indexDocument(esClient, 'logs', {
            '@timestamp': '2024-01-01T00:00:11.000Z',
            'client.geo.lat': 40.7,
            'client.geo.lon': -74.0,
          });

          // Already normalized object
          await indexDocument(esClient, 'logs', {
            '@timestamp': '2024-01-01T00:00:12.000Z',
            'server.location': { lat: 51.5, lon: -0.125 },
          });

          // WKT string format
          await indexDocument(esClient, 'logs', {
            '@timestamp': '2024-01-01T00:00:13.000Z',
            'origin.point': 'POINT (-122.4194 37.7749)',
          });

          // Multiple geo_point fields in same doc
          await indexDocument(esClient, 'logs', {
            '@timestamp': '2024-01-01T00:00:14.000Z',
            'source.geo.lat': 48.8566,
            'source.geo.lon': 2.3522,
            'dest.geo.lat': 35.6762,
            'dest.geo.lon': 139.6503,
          });

          // Mix of geo_point and regular fields
          await indexDocument(esClient, 'logs', {
            '@timestamp': '2024-01-01T00:00:15.000Z',
            'event.location.lat': 34.0522,
            'event.location.lon': -118.2437,
            'event.name': 'test_event',
          });

          // Only lat exists (partial - should not match)
          await indexDocument(esClient, 'logs', {
            '@timestamp': '2024-01-01T00:00:16.000Z',
            'partial.geo.lat': 40.0,
          });
        });

        it('returns combined geo_point objects for flattened lat/lon', async () => {
          const response = await apiClient.fetch(
            'POST /internal/streams/{name}/schema/fields_simulation',
            {
              params: {
                path: { name: 'logs' },
                body: {
                  field_definitions: [{ name: 'attributes.client.geo', type: 'geo_point' }],
                },
              },
            }
          );

          expect(response.body.status).to.be('success');
          expect(response.body.simulationError).to.be(null);

          const docs = response.body.documentsWithRuntimeFieldsApplied;
          if (!docs || docs.length === 0) {
            throw new Error('Expected at least one simulated document');
          }

          // Find the specific document with our target field
          const target = docs.find((d) => d.values && 'attributes.client.geo' in d.values);
          if (!target) {
            throw new Error('Expected document with attributes.client.geo field');
          }
          const doc = target.values!;
          expect(doc).to.have.property('attributes.client.geo');
          expect(doc['attributes.client.geo']).to.eql({ lat: 40.7, lon: -74.0 });
          expect(doc).not.to.have.property('attributes.client.geo.lat');
          expect(doc).not.to.have.property('attributes.client.geo.lon');
        });

        it('preserves already normalized geo_point objects', async () => {
          const response = await apiClient.fetch(
            'POST /internal/streams/{name}/schema/fields_simulation',
            {
              params: {
                path: { name: 'logs' },
                body: {
                  field_definitions: [{ name: 'attributes.server.location', type: 'geo_point' }],
                },
              },
            }
          );

          expect(response.body.status).to.be('success');
          expect(response.body.simulationError).to.be(null);

          const docs = response.body.documentsWithRuntimeFieldsApplied;
          if (!docs || docs.length === 0) {
            throw new Error('Expected at least one simulated document');
          }

          // Find the specific document with our target field
          const target = docs.find((d) => d.values && 'attributes.server.location' in d.values);
          if (!target) {
            throw new Error('Expected document with attributes.server.location field');
          }
          const doc = target.values!;
          expect(doc).to.have.property('attributes.server.location');
          expect(doc['attributes.server.location']).to.eql({ lat: 51.5, lon: -0.125 });
        });

        it('preserves WKT string format geo_points', async () => {
          const response = await apiClient.fetch(
            'POST /internal/streams/{name}/schema/fields_simulation',
            {
              params: {
                path: { name: 'logs' },
                body: {
                  field_definitions: [{ name: 'attributes.origin.point', type: 'geo_point' }],
                },
              },
            }
          );

          expect(response.body.status).to.be('success');
          expect(response.body.simulationError).to.be(null);

          const docs = response.body.documentsWithRuntimeFieldsApplied;
          if (!docs || docs.length === 0) {
            throw new Error('Expected at least one simulated document');
          }

          // Find the specific document with our target field
          const target = docs.find((d) => d.values && 'attributes.origin.point' in d.values);
          if (!target) {
            throw new Error('Expected document with attributes.origin.point field');
          }
          const doc = target.values!;
          expect(doc).to.have.property('attributes.origin.point');
          expect(doc['attributes.origin.point']).to.be('POINT (-122.4194 37.7749)');
        });

        it('handles multiple geo_point fields in the same document', async () => {
          const response = await apiClient.fetch(
            'POST /internal/streams/{name}/schema/fields_simulation',
            {
              params: {
                path: { name: 'logs' },
                body: {
                  field_definitions: [
                    { name: 'attributes.source.geo', type: 'geo_point' },
                    { name: 'attributes.dest.geo', type: 'geo_point' },
                  ],
                },
              },
            }
          );

          expect(response.body.status).to.be('success');
          expect(response.body.simulationError).to.be(null);

          const docs = response.body.documentsWithRuntimeFieldsApplied;
          if (!docs || docs.length === 0) {
            throw new Error('Expected at least one simulated document');
          }

          // Find doc with both geo_point fields
          const target = docs.find(
            (d) =>
              d.values && 'attributes.source.geo' in d.values && 'attributes.dest.geo' in d.values
          );
          if (!target) {
            throw new Error(
              'Expected document with both attributes.source.geo and attributes.dest.geo fields'
            );
          }
          const doc = target.values!;
          expect(doc).to.have.property('attributes.source.geo');
          expect(doc['attributes.source.geo']).to.eql({ lat: 48.8566, lon: 2.3522 });
          expect(doc).to.have.property('attributes.dest.geo');
          expect(doc['attributes.dest.geo']).to.eql({ lat: 35.6762, lon: 139.6503 });
        });

        it('handles mix of geo_point and regular fields', async () => {
          const response = await apiClient.fetch(
            'POST /internal/streams/{name}/schema/fields_simulation',
            {
              params: {
                path: { name: 'logs' },
                body: {
                  field_definitions: [
                    { name: 'attributes.event.location', type: 'geo_point' },
                    { name: 'attributes.event.name', type: 'keyword' },
                  ],
                },
              },
            }
          );

          expect(response.body.status).to.be('success');
          expect(response.body.simulationError).to.be(null);

          const docs = response.body.documentsWithRuntimeFieldsApplied;
          if (!docs || docs.length === 0) {
            throw new Error('Expected at least one simulated document');
          }

          // Find doc with both fields
          const target = docs.find(
            (d) =>
              d.values &&
              'attributes.event.location' in d.values &&
              'attributes.event.name' in d.values
          );
          if (!target) {
            throw new Error(
              'Expected document with attributes.event.location and attributes.event.name fields'
            );
          }
          const doc = target.values!;
          expect(doc).to.have.property('attributes.event.location');
          expect(doc['attributes.event.location']).to.eql({ lat: 34.0522, lon: -118.2437 });
          expect(doc).to.have.property('attributes.event.name');
          expect(doc['attributes.event.name']).to.be('test_event');
        });

        it('returns unknown when only partial geo_point data exists (lat without lon)', async () => {
          const response = await apiClient.fetch(
            'POST /internal/streams/{name}/schema/fields_simulation',
            {
              params: {
                path: { name: 'logs' },
                body: {
                  field_definitions: [{ name: 'attributes.partial.geo', type: 'geo_point' }],
                },
              },
            }
          );

          // Should return unknown because the query requires both lat and lon to exist
          expect(response.body.status).to.be('unknown');
          expect(response.body.simulationError).to.be(null);
          expect(response.body.documentsWithRuntimeFieldsApplied).to.be(null);
        });
      });
    });
  });
}
