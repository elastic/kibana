/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { generateArchive, parseArchive } from '@kbn/streams-plugin/server/lib/content';
import { Readable } from 'stream';
import type { ContentPack, ContentPackStream } from '@kbn/content-packs-schema';
import { ROOT_STREAM_ID } from '@kbn/content-packs-schema';
import type { FieldDefinition, RoutingDefinition, StreamQuery } from '@kbn/streams-schema';
import { Streams, emptyAssets } from '@kbn/streams-schema';
import {
  OBSERVABILITY_STREAMS_ENABLE_CONTENT_PACKS,
  OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS,
} from '@kbn/management-settings-ids';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';
import {
  disableStreams,
  enableStreams,
  exportContent,
  getStream,
  importContent,
  putStream,
} from './helpers/requests';

const upsertRequest = ({
  fields = {},
  routing = [],
  queries = [],
}: {
  fields?: FieldDefinition;
  routing?: RoutingDefinition[];
  queries?: StreamQuery[];
}) => ({
  ...emptyAssets,
  queries,
  stream: {
    description: 'Test stream',
    ingest: {
      processing: { steps: [] },
      settings: {},
      wired: { fields, routing },
      lifecycle: { inherit: {} },
      failure_store: { inherit: {} },
    },
  },
});

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const kibanaServer = getService('kibanaServer');
  let apiClient: StreamsSupertestRepositoryClient;

  describe('Content packs', () => {
    before(async () => {
      await kibanaServer.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS]: true,
        [OBSERVABILITY_STREAMS_ENABLE_CONTENT_PACKS]: true,
      });

      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);

      await putStream(
        apiClient,
        'logs.branch_a.child1.nested',
        upsertRequest({
          queries: [
            { id: 'my-error-query', title: 'error query', kql: { query: 'message: ERROR' } },
          ],
        })
      );
      await putStream(
        apiClient,
        'logs.branch_a.child1',
        upsertRequest({
          routing: [
            {
              destination: 'logs.branch_a.child1.nested',
              where: { field: 'resource.attributes.hello', eq: 'yes' },
              status: 'enabled',
            },
          ],
        })
      );
      await putStream(apiClient, 'logs.branch_a.child2', upsertRequest({}));
      await putStream(apiClient, 'logs.branch_b.child1', upsertRequest({}));
      await putStream(apiClient, 'logs.branch_b.child2', upsertRequest({}));
      await putStream(
        apiClient,
        'logs.branch_a',
        upsertRequest({
          fields: {
            'resource.attributes.foo.bar': { type: 'keyword' },
          },
          routing: [
            {
              destination: 'logs.branch_a.child1',
              where: { field: 'resource.attributes.foo', eq: 'bar' },
              status: 'enabled',
            },
            {
              destination: 'logs.branch_a.child2',
              where: { field: 'resource.attributes.bar', eq: 'foo' },
              status: 'enabled',
            },
          ],
        })
      );
      await putStream(
        apiClient,
        'logs.branch_b',
        upsertRequest({
          routing: [
            {
              destination: 'logs.branch_b.child1',
              where: { field: 'resource.attributes.foo', eq: 'bar' },
              status: 'enabled',
            },
            {
              destination: 'logs.branch_b.child2',
              where: { field: 'resource.attributes.bar', eq: 'foo' },
              status: 'enabled',
            },
          ],
        })
      );
    });

    after(async () => {
      await disableStreams(apiClient);

      await kibanaServer.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS]: false,
      });
    });

    describe('Export', () => {
      it('exports all streams from logs', async () => {
        const exportBody = {
          name: 'logs_content_pack',
          description: 'Content pack with all logs streams',
          version: '1.0.0',
          include: { objects: { all: {} } },
        };

        const archiveBuffer = await exportContent(apiClient, 'logs', exportBody);
        const contentPack = await parseArchive(Readable.from(archiveBuffer));

        expect(contentPack.name).to.eql('logs_content_pack');
        expect(contentPack.description).to.eql('Content pack with all logs streams');
        expect(contentPack.version).to.eql('1.0.0');
        expect(contentPack.entries.length).to.be.greaterThan(0);

        const streamEntries = contentPack.entries.filter(
          (entry): entry is ContentPackStream => entry.type === 'stream'
        );

        expect(streamEntries.every((entry) => Streams.all.UpsertRequest.is(entry.request))).to.eql(
          true
        );
        expect(streamEntries.map((entry) => entry.name).sort()).to.eql([
          ROOT_STREAM_ID,
          'branch_a',
          'branch_a.child1',
          'branch_a.child1.nested',
          'branch_a.child2',
          'branch_b',
          'branch_b.child1',
          'branch_b.child2',
        ]);
      });

      it('exports selected streams from logs', async () => {
        const exportBody = {
          name: 'selective_logs_content_pack',
          description: 'Content pack with selected logs streams',
          version: '1.0.0',
          include: {
            objects: {
              mappings: true,
              queries: [],
              routing: [
                {
                  destination: 'branch_a',
                  objects: {
                    mappings: true,
                    queries: [],
                    routing: [
                      {
                        destination: 'branch_a.child1',
                        objects: {
                          mappings: true,
                          queries: [],
                          routing: [
                            {
                              destination: 'branch_a.child1.nested',
                              objects: {
                                mappings: true,
                                queries: [{ id: 'my-error-query' }],
                                routing: [],
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        };

        const archiveBuffer = await exportContent(apiClient, 'logs', exportBody);
        const contentPack = await parseArchive(Readable.from(archiveBuffer));

        expect(contentPack.name).to.eql('selective_logs_content_pack');

        const includedStreams = contentPack.entries
          .filter((entry): entry is ContentPackStream => entry.type === 'stream')
          .map((entry) => entry.name)
          .sort();

        expect(includedStreams).to.eql([
          ROOT_STREAM_ID,
          'branch_a',
          'branch_a.child1',
          'branch_a.child1.nested',
        ]);
        const rootEntry = contentPack.entries.find(
          (entry): entry is ContentPackStream =>
            entry.type === 'stream' && entry.name === ROOT_STREAM_ID
        )!;
        expect(rootEntry.request.stream.ingest.wired.routing).to.eql([
          {
            destination: 'branch_a',
            where: { never: {} },
            status: 'disabled',
          },
        ]);
        const leafEntry = contentPack.entries.find(
          (entry): entry is ContentPackStream =>
            entry.type === 'stream' && entry.name === 'branch_a.child1.nested'
        )!;
        expect(leafEntry.request.queries).to.eql([
          {
            id: 'my-error-query',
            title: 'error query',
            kql: { query: 'message: ERROR' },
          },
        ]);
      });

      const expectMappings = (contentPack: ContentPack, fields: FieldDefinition) => {
        expect(contentPack.entries).to.have.length(1);

        const rootEntry = contentPack.entries.find(
          (entry): entry is ContentPackStream =>
            entry.type === 'stream' && entry.name === ROOT_STREAM_ID
        )!;
        expect(rootEntry.request.stream.ingest.wired.fields).to.eql(fields);
      };

      it('respects mappings inclusion', async () => {
        const contentPackWithoutMappings = await parseArchive(
          Readable.from(
            await exportContent(apiClient, 'logs.branch_a', {
              name: 'check-mappings',
              description: '',
              version: '1.0.0',
              include: {
                objects: {
                  mappings: false,
                  queries: [],
                  routing: [],
                },
              },
            })
          )
        );
        expectMappings(contentPackWithoutMappings, {});

        const contentPackWithMappings = await parseArchive(
          Readable.from(
            await exportContent(apiClient, 'logs.branch_a', {
              name: 'check-mappings',
              description: '',
              version: '1.0.0',
              include: {
                objects: {
                  mappings: true,
                  queries: [],
                  routing: [],
                },
              },
            })
          )
        );

        expectMappings(contentPackWithMappings, {
          'resource.attributes.foo.bar': { type: 'keyword' },
        });
      });

      it('pulls inherited mappings in the exported root', async () => {
        // mapping is set on logs.branch_a parent
        const contentPack = await parseArchive(
          Readable.from(
            await exportContent(apiClient, 'logs.branch_a.child1', {
              name: 'check-mappings',
              description: '',
              version: '1.0.0',
              include: {
                objects: { mappings: true, queries: [], routing: [] },
              },
            })
          )
        );

        expectMappings(contentPack, { 'resource.attributes.foo.bar': { type: 'keyword' } });
      });

      it('does not export base fields', async () => {
        const contentPack = await parseArchive(
          Readable.from(
            await exportContent(apiClient, 'logs', {
              name: 'check-mappings',
              description: '',
              version: '1.0.0',
              include: {
                objects: { mappings: true, queries: [], routing: [] },
              },
            })
          )
        );

        expectMappings(contentPack, {});
      });

      it('fails when trying to export a stream thats not a descendant', async () => {
        const exportBody = {
          name: 'nonexistent_stream_pack',
          description: 'Content pack for non-existent stream',
          version: '1.0.0',
          include: {
            objects: {
              mappings: true,
              queries: [],
              routing: [
                {
                  destination: 'branch_b',
                  objects: {
                    mappings: true,
                    queries: [],
                    routing: [
                      {
                        destination: 'branch_b.child1',
                        objects: { mappings: true, queries: [], routing: [] },
                      },
                    ],
                  },
                },
              ],
            },
          },
        };

        await exportContent(apiClient, 'logs.branch_a', exportBody, 400);
      });
    });

    describe('Import', () => {
      it('fails if an object is too large', async () => {
        const twoMB = 2 * 1024 * 1024;
        const archive = await generateArchive(
          {
            name: 'content_pack',
            description: 'with objects too big',
            version: '1.0.0',
          },
          [
            {
              type: 'stream',
              name: 'a.regular.stream',
              request: {
                stream: {
                  description: 'ok',
                  ingest: {
                    processing: { steps: [] },
                    settings: {},
                    wired: { fields: {}, routing: [] },
                    lifecycle: { inherit: {} },
                    failure_store: { inherit: {} },
                  },
                },
                ...emptyAssets,
              },
            },
            {
              type: 'stream',
              name: 'a.big.stream',
              request: {
                stream: {
                  description: 'a'.repeat(twoMB),
                  ingest: {
                    processing: { steps: [] },
                    settings: {},
                    wired: { fields: {}, routing: [] },
                    lifecycle: { inherit: {} },
                    failure_store: { inherit: {} },
                  },
                },
                ...emptyAssets,
              },
            },
          ]
        );

        const response = await importContent(
          apiClient,
          'logs',
          {
            include: { objects: { all: {} } },
            content: Readable.from(archive),
            filename: 'content_pack-1.0.0.zip',
          },
          400
        );

        expect((response as unknown as { message: string }).message).to.match(
          /^Object \[content_pack-1.0.0\/stream\/a.big.stream.json\] exceeds the limit of \d+ bytes/
        );
      });

      it('imports into a stream', async () => {
        const exportBody = {
          name: 'branch_a_child1_content_pack',
          description: 'Content pack from branch_a with nested child',
          version: '1.0.0',
          include: {
            objects: {
              mappings: true,
              queries: [],
              routing: [
                {
                  destination: 'nested',
                  objects: { mappings: true, queries: [{ id: 'my-error-query' }], routing: [] },
                },
              ],
            },
          },
        };
        const archiveBuffer = await exportContent(apiClient, 'logs.branch_a.child1', exportBody);

        await putStream(apiClient, 'logs.branch_c', upsertRequest({}));

        const importResponse = await importContent(apiClient, 'logs.branch_c', {
          include: { objects: { all: {} } },
          content: Readable.from(archiveBuffer),
          filename: 'branch_a_content_pack-1.0.0.zip',
        });
        expect(importResponse.result.created).to.eql(['logs.branch_c.nested']);

        const updatedStream = (await getStream(
          apiClient,
          'logs.branch_c'
        )) as Streams.WiredStream.GetResponse;

        expect(updatedStream.stream.ingest.wired.routing).to.eql([
          {
            destination: 'logs.branch_c.nested',
            status: 'enabled',
            where: {
              field: 'resource.attributes.hello',
              eq: 'yes',
            },
          },
        ]);
        // check if the mapping set on unexported logs.branch_a are correctly exported
        expect(updatedStream.stream.ingest.wired.fields['resource.attributes.foo.bar']).to.eql({
          type: 'keyword',
        });

        // check that the created stream includes the queries
        const createdStream = (await getStream(
          apiClient,
          'logs.branch_c.nested'
        )) as Streams.WiredStream.GetResponse;
        expect(createdStream.queries).to.eql([
          {
            id: 'my-error-query',
            title: 'error query',
            kql: { query: 'message: ERROR' },
          },
        ]);
      });

      it('imports selected streams', async () => {
        const exportBody = {
          name: 'complete_tree',
          description: 'Content pack from logs',
          version: '1.0.0',
          include: { objects: { all: {} } },
        };
        const archiveBuffer = await exportContent(apiClient, 'logs', exportBody);

        await putStream(apiClient, 'logs.branch_d', upsertRequest({}));

        const importResponse = await importContent(apiClient, 'logs.branch_d', {
          include: {
            objects: {
              mappings: true,
              queries: [],
              routing: [
                {
                  destination: 'branch_b',
                  objects: {
                    mappings: true,
                    queries: [],
                    routing: [
                      {
                        destination: 'branch_b.child1',
                        objects: { mappings: true, queries: [], routing: [] },
                      },
                    ],
                  },
                },
              ],
            },
          },
          content: Readable.from(archiveBuffer),
          filename: 'complete_tree-1.0.0.zip',
        });

        expect(importResponse.result.created).to.eql([
          'logs.branch_d.branch_b',
          'logs.branch_d.branch_b.child1',
        ]);

        const updatedStream = (await getStream(
          apiClient,
          'logs.branch_d'
        )) as Streams.WiredStream.GetResponse;

        expect(updatedStream.stream.ingest.wired.routing).to.eql([
          {
            destination: 'logs.branch_d.branch_b',
            where: { never: {} },
            status: 'disabled',
          },
        ]);
      });

      it('fails when importing conflicting mappings', async () => {
        const generateWithMappings = (fields: FieldDefinition) =>
          generateArchive(
            {
              name: 'conflict_pack',
              description: 'Content pack with conflicting mappings',
              version: '1.0.0',
            },
            [
              {
                type: 'stream',
                name: ROOT_STREAM_ID,
                request: {
                  stream: {
                    description: '',
                    ingest: {
                      processing: { steps: [] },
                      settings: {},
                      wired: {
                        fields,
                        routing: [],
                      },
                      lifecycle: { inherit: {} },
                      failure_store: { inherit: {} },
                    },
                  },
                  ...emptyAssets,
                },
              },
            ]
          );

        const targetStreamName = 'logs.branch_a';

        // fails when the field type changes
        let response = await importContent(
          apiClient,
          targetStreamName,
          {
            include: { objects: { all: {} } },
            content: Readable.from(
              await generateWithMappings({
                'resource.attributes.foo.bar': { type: 'long' },
              })
            ),
            filename: 'conflict_pack-1.0.0.zip',
          },
          409
        );

        expect((response as unknown as { message: string }).message).to.eql(
          'Cannot change mapping of [resource.attributes.foo.bar] for [logs.branch_a]'
        );

        // fails when field configuration changes
        response = await importContent(
          apiClient,
          targetStreamName,
          {
            include: { objects: { all: {} } },
            content: Readable.from(
              await generateWithMappings({
                'resource.attributes.foo.bar': { type: 'keyword', boost: 2.0 },
              })
            ),
            filename: 'conflict_pack-1.0.0.zip',
          },
          409
        );

        expect((response as unknown as { message: string }).message).to.eql(
          'Cannot change mapping of [resource.attributes.foo.bar] for [logs.branch_a]'
        );

        // succeeds when the field configuration is unchanged
        await importContent(
          apiClient,
          targetStreamName,
          {
            include: { objects: { all: {} } },
            content: Readable.from(
              await generateWithMappings({
                'resource.attributes.foo.bar': { type: 'keyword' },
              })
            ),
            filename: 'conflict_pack-1.0.0.zip',
          },
          200
        );
      });

      it('fails when importing overlapping child', async () => {
        const targetStreamName = 'logs.overlapping.child';
        await putStream(apiClient, targetStreamName, upsertRequest({}));

        const archive = await generateArchive(
          {
            name: 'content_pack',
            description: 'with overlapping child',
            version: '1.0.0',
          },
          [
            {
              type: 'stream',
              name: ROOT_STREAM_ID,
              request: {
                stream: {
                  description: '',
                  ingest: {
                    processing: { steps: [] },
                    settings: {},
                    wired: {
                      fields: {},
                      routing: [
                        {
                          destination: 'child',
                          where: { never: {} },
                          status: 'disabled',
                        },
                      ],
                    },
                    lifecycle: { inherit: {} },
                    failure_store: { inherit: {} },
                  },
                },
                ...emptyAssets,
              },
            },
            {
              type: 'stream',
              name: 'child',
              request: {
                stream: {
                  description: '',
                  ingest: {
                    processing: { steps: [] },
                    settings: {},
                    wired: { fields: {}, routing: [] },
                    lifecycle: { inherit: {} },
                    failure_store: { inherit: {} },
                  },
                },
                ...emptyAssets,
              },
            },
          ]
        );

        const response = await importContent(
          apiClient,
          'logs.overlapping',
          {
            include: { objects: { all: {} } },
            content: Readable.from(archive),
            filename: 'overlap-1.0.0.zip',
          },
          409
        );

        expect((response as unknown as { message: string }).message).to.eql(
          '[logs.overlapping.child] already exists'
        );
      });

      it('fails when importing existing query', async () => {
        const archive = await generateArchive(
          {
            name: 'content_pack',
            description: 'with overlapping query',
            version: '1.0.0',
          },
          [
            {
              type: 'stream',
              name: ROOT_STREAM_ID,
              request: {
                stream: {
                  description: '',
                  ingest: {
                    processing: { steps: [] },
                    settings: {},
                    wired: {
                      fields: {},
                      routing: [],
                    },
                    lifecycle: { inherit: {} },
                    failure_store: { inherit: {} },
                  },
                },
                ...emptyAssets,
                queries: [
                  { id: 'my-error-query', title: 'error query', kql: { query: 'message: ERROR' } },
                ],
              },
            },
          ]
        );

        const response = await importContent(
          apiClient,
          'logs.branch_a.child1.nested',
          {
            include: { objects: { all: {} } },
            content: Readable.from(archive),
            filename: 'overlap-1.0.0.zip',
          },
          409
        );

        expect((response as unknown as { message: string }).message).to.eql(
          'Query [my-error-query | error query] already exists on [logs.branch_a.child1.nested]'
        );
      });
    });
  });
}
