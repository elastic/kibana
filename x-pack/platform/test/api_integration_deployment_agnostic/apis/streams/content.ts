/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  generateArchive,
  isContentPackStreamRequest,
  parseArchive,
} from '@kbn/streams-plugin/server/lib/content';
import { Readable } from 'stream';
import { crc32 } from 'zlib';
import type { ContentPack, ContentPackEntry, ContentPackStream } from '@kbn/content-packs-schema';
import { ROOT_STREAM_ID } from '@kbn/content-packs-schema';
import type { FieldDefinition, RoutingDefinition, Streams } from '@kbn/streams-schema';
import { emptyAssets } from '@kbn/streams-schema';
import {
  OBSERVABILITY_STREAMS_ENABLE_CONTENT_PACKS,
  OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS,
} from '@kbn/management-settings-ids';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';
import { bulkQueries, getQueries } from '../significant_events/helpers/requests';
import {
  disableStreams,
  enableStreams,
  exportContent,
  getStream,
  importContent,
  previewContent,
  putStream,
} from './helpers/requests';

const upsertRequest = ({
  fields = {},
  routing = [],
}: {
  fields?: FieldDefinition;
  routing?: RoutingDefinition[];
}): Streams.WiredStream.UpsertRequest => ({
  ...emptyAssets,
  stream: {
    type: 'wired',
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

// Content-pack saved objects are stored as opaque JSON and cast on parse, so these minimal fixtures
// are enough to exercise the read path. `padding` inflates the lens so a few of them fan out past
// the total decompression budget.
const lensEntry = (id: string, padding: number): ContentPackEntry =>
  ({
    type: 'lens',
    id,
    attributes: { title: id, padding: 'a'.repeat(padding) },
    references: [],
  } as unknown as ContentPackEntry);

const dashboardEntry = (id: string, lensIds: string[]): ContentPackEntry =>
  ({
    type: 'dashboard',
    id,
    attributes: { title: id },
    references: lensIds.map((lensId, i) => ({ name: `ref_${i}`, type: 'lens', id: lensId })),
  } as unknown as ContentPackEntry);

const wiredStreamEntry = (name: string, description: string): ContentPackStream => ({
  type: 'stream',
  name,
  request: {
    stream: {
      type: 'wired',
      description,
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
});

// zip central-directory + local-header field offsets
const CENSIG = 0x02014b50;
const LOCSIG = 0x04034b50;
const CENLEN = 24; // uncompressed size in central header
const CENNAM = 28; // file name length
const CENEXT = 30; // extra field length
const CENCOM = 32; // comment length
const CENOFF = 42; // relative offset of local header
const CENHDR = 46; // central header fixed size
const LOCLEN = 22; // uncompressed size in local header

// Patches an entry's declared uncompressed size (central + local headers) down to `fakeSize` while
// leaving the deflate stream intact, simulating a lying entry: the header claims it is tiny but it
// still inflates large. adm-zip passes the central-header size to zlib as `maxOutputLength`, so the
// synchronous inflate throws once the real output exceeds the fake size. Returns whether the entry
// was found and patched.
const tamperUncompressedSize = (buffer: Buffer, entryName: string, fakeSize: number): boolean => {
  const nameBuf = Buffer.from(entryName);
  for (let i = 0; i + CENHDR <= buffer.length; i++) {
    if (buffer.readUInt32LE(i) !== CENSIG) continue;
    const nameLen = buffer.readUInt16LE(i + CENNAM);
    const extraLen = buffer.readUInt16LE(i + CENEXT);
    const commentLen = buffer.readUInt16LE(i + CENCOM);
    const name = buffer.subarray(i + CENHDR, i + CENHDR + nameLen);
    if (name.equals(nameBuf)) {
      buffer.writeUInt32LE(fakeSize, i + CENLEN);
      const locOff = buffer.readUInt32LE(i + CENOFF);
      if (buffer.readUInt32LE(locOff) === LOCSIG) {
        buffer.writeUInt32LE(fakeSize, locOff + LOCLEN);
      }
      return true;
    }
    i += CENHDR + nameLen + extraLen + commentLen - 1;
  }
  return false;
};

// Builds an uncompressed (STORED) zip with entries at exact paths. `generateArchive` writes saved
// objects under `<root>/kibana/<type>/`, but the importer only matches saved objects it extracts
// directly (streams and flat `<root>/dashboard/` entries). A malicious upload is not built by
// `generateArchive`, so this hand-rolls the exact bytes: dashboards flat under `<root>/dashboard/`
// (where the importer picks them up and resolves their references) plus one shared lens under
// `<root>/kibana/lens/` (where `resolveDashboard` looks references up). That is the reference
// fan-out shape a single large object referenced by many dashboards.
const buildStoredArchive = (files: Array<{ path: string; content: Buffer }>): Buffer => {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  for (const { path: filePath, content } of files) {
    const name = Buffer.from(filePath);
    const checksum = crc32(content); // zlib.crc32 returns an unsigned 32-bit integer

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(LOCSIG, 0);
    localHeader.writeUInt16LE(20, 4); // version needed to extract
    localHeader.writeUInt16LE(0, 6); // general purpose flags
    localHeader.writeUInt16LE(0, 8); // compression method: stored
    localHeader.writeUInt16LE(0, 10); // mod time
    localHeader.writeUInt16LE(0, 12); // mod date
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(content.length, 18); // compressed size
    localHeader.writeUInt32LE(content.length, LOCLEN); // uncompressed size
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28); // extra field length
    localParts.push(localHeader, name, content);

    const centralHeader = Buffer.alloc(CENHDR);
    centralHeader.writeUInt32LE(CENSIG, 0);
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed to extract
    centralHeader.writeUInt16LE(0, 8); // general purpose flags
    centralHeader.writeUInt16LE(0, 10); // compression method: stored
    centralHeader.writeUInt16LE(0, 12); // mod time
    centralHeader.writeUInt16LE(0, 14); // mod date
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(content.length, 20); // compressed size
    centralHeader.writeUInt32LE(content.length, CENLEN); // uncompressed size
    centralHeader.writeUInt16LE(name.length, CENNAM);
    centralHeader.writeUInt16LE(0, CENEXT);
    centralHeader.writeUInt16LE(0, CENCOM);
    centralHeader.writeUInt16LE(0, 34); // disk number start
    centralHeader.writeUInt16LE(0, 36); // internal file attributes
    centralHeader.writeUInt32LE(0, 38); // external file attributes
    centralHeader.writeUInt32LE(offset, CENOFF);
    centralParts.push(centralHeader, name);

    offset += localHeader.length + name.length + content.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // central directory disk
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralDirectory.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20); // comment length
  return Buffer.concat([...localParts, centralDirectory, eocd]);
};

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const kibanaServer = getService('kibanaServer');
  let apiClient: StreamsSupertestRepositoryClient;

  describe('Content packs', () => {
    before(async () => {
      await kibanaServer.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_CONTENT_PACKS]: true,
        // Significant events are seeded via the queries API in some tests below to prove export
        // never carries them; that API is gated behind this feature flag.
        [OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS]: true,
      });
      await kibanaServer.uiSettings.waitForEventualCacheRefresh();

      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);

      await putStream(apiClient, 'logs.otel.branch_a.child1.nested', upsertRequest({}));
      await putStream(
        apiClient,
        'logs.otel.branch_a.child1',
        upsertRequest({
          routing: [
            {
              destination: 'logs.otel.branch_a.child1.nested',
              where: { field: 'resource.attributes.hello', eq: 'yes' },
              status: 'enabled',
            },
          ],
        })
      );
      await putStream(apiClient, 'logs.otel.branch_a.child2', upsertRequest({}));
      await putStream(apiClient, 'logs.otel.branch_b.child1', upsertRequest({}));
      await putStream(apiClient, 'logs.otel.branch_b.child2', upsertRequest({}));
      await putStream(
        apiClient,
        'logs.otel.branch_a',
        upsertRequest({
          fields: {
            'resource.attributes.foo.bar': { type: 'keyword' },
          },
          routing: [
            {
              destination: 'logs.otel.branch_a.child1',
              where: { field: 'resource.attributes.foo', eq: 'bar' },
              status: 'enabled',
            },
            {
              destination: 'logs.otel.branch_a.child2',
              where: { field: 'resource.attributes.bar', eq: 'foo' },
              status: 'enabled',
            },
          ],
        })
      );
      await putStream(
        apiClient,
        'logs.otel.branch_b',
        upsertRequest({
          routing: [
            {
              destination: 'logs.otel.branch_b.child1',
              where: { field: 'resource.attributes.foo', eq: 'bar' },
              status: 'enabled',
            },
            {
              destination: 'logs.otel.branch_b.child2',
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
      await kibanaServer.uiSettings.waitForEventualCacheRefresh();
    });

    describe('Export', () => {
      it('exports all streams from logs.otel', async () => {
        const exportBody = {
          name: 'logs_content_pack',
          description: 'Content pack with all logs.otel streams',
          version: '1.0.0',
          include: { objects: { all: {} } },
        };

        const archiveBuffer = await exportContent(apiClient, 'logs.otel', exportBody);
        const contentPack = await parseArchive(Readable.from(archiveBuffer));

        expect(contentPack.name).to.eql('logs_content_pack');
        expect(contentPack.description).to.eql('Content pack with all logs.otel streams');
        expect(contentPack.version).to.eql('1.0.0');
        expect(contentPack.entries.length).to.be.greaterThan(0);

        const streamEntries = contentPack.entries.filter(
          (entry): entry is ContentPackStream => entry.type === 'stream'
        );

        expect(streamEntries.every((entry) => isContentPackStreamRequest(entry.request))).to.eql(
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

      it('exports selected streams from logs.otel', async () => {
        const exportBody = {
          name: 'selective_logs_content_pack',
          description: 'Content pack with selected logs.otel streams',
          version: '1.0.0',
          include: {
            objects: {
              mappings: true,
              routing: [
                {
                  destination: 'branch_a',
                  objects: {
                    mappings: true,
                    routing: [
                      {
                        destination: 'branch_a.child1',
                        objects: {
                          mappings: true,
                          routing: [
                            {
                              destination: 'branch_a.child1.nested',
                              objects: {
                                mappings: true,
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

        const archiveBuffer = await exportContent(apiClient, 'logs.otel', exportBody);
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
            await exportContent(apiClient, 'logs.otel.branch_a', {
              name: 'check-mappings',
              description: '',
              version: '1.0.0',
              include: {
                objects: {
                  mappings: false,
                  routing: [],
                },
              },
            })
          )
        );
        expectMappings(contentPackWithoutMappings, {});

        const contentPackWithMappings = await parseArchive(
          Readable.from(
            await exportContent(apiClient, 'logs.otel.branch_a', {
              name: 'check-mappings',
              description: '',
              version: '1.0.0',
              include: {
                objects: {
                  mappings: true,
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
        // mapping is set on logs.otel.branch_a parent
        const contentPack = await parseArchive(
          Readable.from(
            await exportContent(apiClient, 'logs.otel.branch_a.child1', {
              name: 'check-mappings',
              description: '',
              version: '1.0.0',
              include: {
                objects: { mappings: true, routing: [] },
              },
            })
          )
        );

        expectMappings(contentPack, { 'resource.attributes.foo.bar': { type: 'keyword' } });
      });

      it('does not export base fields', async () => {
        const contentPack = await parseArchive(
          Readable.from(
            await exportContent(apiClient, 'logs.otel', {
              name: 'check-mappings',
              description: '',
              version: '1.0.0',
              include: {
                objects: { mappings: true, routing: [] },
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
              routing: [
                {
                  destination: 'branch_b',
                  objects: {
                    mappings: true,
                    routing: [
                      {
                        destination: 'branch_b.child1',
                        objects: { mappings: true, routing: [] },
                      },
                    ],
                  },
                },
              ],
            },
          },
        };

        await exportContent(apiClient, 'logs.otel.branch_a', exportBody, 400);
      });

      it('omits significant-event queries from the exported pack', async () => {
        // Significant-event queries live outside the stream definition (in the knowledge-indicator
        // data stream), so export must never carry them even when the stream has detections.
        await bulkQueries(apiClient, 'logs.otel.branch_a', [
          {
            index: {
              id: 'export-omits-me',
              title: 'detector',
              description: '',
              esql: {
                query: `FROM logs.otel.branch_a,logs.otel.branch_a.* METADATA _id, _source | WHERE KQL("message:'ERROR'")`,
              },
            },
          },
        ]);

        const archiveBuffer = await exportContent(apiClient, 'logs.otel.branch_a', {
          name: 'branch_a_pack',
          description: 'export should not carry queries',
          version: '1.0.0',
          include: { objects: { all: {} } },
        });
        const contentPack = await parseArchive(Readable.from(archiveBuffer));

        const streamEntries = contentPack.entries.filter(
          (entry): entry is ContentPackStream => entry.type === 'stream'
        );
        expect(streamEntries.length).to.be.greaterThan(0);
        streamEntries.forEach((entry) => {
          expect(entry.request).to.not.have.property('queries');
        });

        // the detection still exists on the stream, it is just not part of the pack
        const { queries } = await getQueries(apiClient, 'logs.otel.branch_a');
        expect(queries.map((query) => query.id)).to.contain('export-omits-me');

        await bulkQueries(apiClient, 'logs.otel.branch_a', [{ delete: { id: 'export-omits-me' } }]);
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
                  type: 'wired',
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
                  type: 'wired',
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
          'logs.otel',
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

      it('fails if an entry lies about its uncompressed size', async () => {
        const twoMB = 2 * 1024 * 1024;
        const archive = await generateArchive(
          { name: 'content_pack', description: 'with a lying entry', version: '1.0.0' },
          [wiredStreamEntry('a.big.stream', 'a'.repeat(twoMB))]
        );

        // Declare the entry as 100 bytes while its deflate stream still inflates to ~2MB. The
        // synchronous inflate must reject it rather than allocate the full 2MB.
        const entryName = 'content_pack-1.0.0/stream/a.big.stream.json';
        expect(tamperUncompressedSize(archive, entryName, 100)).to.eql(true);

        const response = await importContent(
          apiClient,
          'logs.otel',
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

      it('fails if the archive exceeds the total uncompressed size', async () => {
        // ~0.9MB per stream stays under the 1MB per-entry cap; 60 of them sum to ~54MB, over the
        // 50MB aggregate cap, while staying well under the 500-entry cap. Rejected at the metadata
        // stage before anything is inflated.
        const almostOneMB = 900 * 1024;
        const streams = Array.from({ length: 60 }, (_, i) =>
          wiredStreamEntry(`a.stream_${i}`, 'a'.repeat(almostOneMB))
        );
        const archive = await generateArchive(
          { name: 'content_pack', description: 'aggregate bomb', version: '1.0.0' },
          streams
        );

        const response = await importContent(
          apiClient,
          'logs.otel',
          {
            include: { objects: { all: {} } },
            content: Readable.from(archive),
            filename: 'content_pack-1.0.0.zip',
          },
          400
        );

        expect((response as unknown as { message: string }).message).to.match(
          /^Content pack exceeds the maximum total uncompressed size of \d+ bytes/
        );
      });

      it('fails if referenced objects fan out beyond the total uncompressed size', async () => {
        // Reference fan-out bypass: one ~0.9MB lens (under the per-entry cap, counted once by the
        // metadata guard) referenced by many dashboards. The metadata caps pass (few entries, small
        // declared total), but materializing the lens once per dashboard blows past the runtime
        // decompression budget. Hand-rolled rather than built with `generateArchive` so the
        // dashboards land flat under `<root>/dashboard/`, where the importer extracts them and calls
        // `resolveDashboard` — the path that re-reads the shared lens once per dashboard.
        const almostOneMB = 900 * 1024;
        const rootDir = 'content_pack-1.0.0';
        const dashboardCount = 80;
        const archive = buildStoredArchive([
          {
            path: `${rootDir}/manifest.yml`,
            content: Buffer.from(
              'name: content_pack\ndescription: reference fan-out bomb\nversion: 1.0.0\n'
            ),
          },
          {
            path: `${rootDir}/kibana/lens/shared_lens.json`,
            content: Buffer.from(JSON.stringify(lensEntry('shared_lens', almostOneMB))),
          },
          ...Array.from({ length: dashboardCount }, (_, i) => ({
            path: `${rootDir}/dashboard/dash_${i}.json`,
            content: Buffer.from(JSON.stringify(dashboardEntry(`dash_${i}`, ['shared_lens']))),
          })),
        ]);

        const response = await importContent(
          apiClient,
          'logs.otel',
          {
            include: { objects: { all: {} } },
            content: Readable.from(archive),
            filename: 'content_pack-1.0.0.zip',
          },
          400
        );

        expect((response as unknown as { message: string }).message).to.match(
          /^Content pack exceeds the maximum total uncompressed size of \d+ bytes/
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
              routing: [
                {
                  destination: 'nested',
                  objects: { mappings: true, routing: [] },
                },
              ],
            },
          },
        };
        const archiveBuffer = await exportContent(
          apiClient,
          'logs.otel.branch_a.child1',
          exportBody
        );

        await putStream(apiClient, 'logs.otel.branch_c', upsertRequest({}));

        const importResponse = await importContent(apiClient, 'logs.otel.branch_c', {
          include: { objects: { all: {} } },
          content: Readable.from(archiveBuffer),
          filename: 'branch_a_content_pack-1.0.0.zip',
        });
        expect(importResponse.result.created).to.eql(['logs.otel.branch_c.nested']);

        const updatedStream = (await getStream(
          apiClient,
          'logs.otel.branch_c'
        )) as Streams.WiredStream.GetResponse;

        expect(updatedStream.stream.ingest.wired.routing).to.eql([
          {
            destination: 'logs.otel.branch_c.nested',
            status: 'enabled',
            where: {
              field: 'resource.attributes.hello',
              eq: 'yes',
            },
          },
        ]);
        // check if the mapping set on unexported logs.otel.branch_a are correctly exported
        expect(updatedStream.stream.ingest.wired.fields['resource.attributes.foo.bar']).to.eql({
          type: 'keyword',
        });
      });

      it('imports selected streams', async () => {
        const exportBody = {
          name: 'complete_tree',
          description: 'Content pack from logs.otel',
          version: '1.0.0',
          include: { objects: { all: {} } },
        };
        const archiveBuffer = await exportContent(apiClient, 'logs.otel', exportBody);

        await putStream(apiClient, 'logs.otel.branch_d', upsertRequest({}));

        const importResponse = await importContent(apiClient, 'logs.otel.branch_d', {
          include: {
            objects: {
              mappings: true,
              routing: [
                {
                  destination: 'branch_b',
                  objects: {
                    mappings: true,
                    routing: [
                      {
                        destination: 'branch_b.child1',
                        objects: { mappings: true, routing: [] },
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
          'logs.otel.branch_d.branch_b',
          'logs.otel.branch_d.branch_b.child1',
        ]);

        const updatedStream = (await getStream(
          apiClient,
          'logs.otel.branch_d'
        )) as Streams.WiredStream.GetResponse;

        expect(updatedStream.stream.ingest.wired.routing).to.eql([
          {
            destination: 'logs.otel.branch_d.branch_b',
            where: { never: {} },
            status: 'disabled',
          },
        ]);
      });

      it('rejects significant-event queries carried by older packs', async () => {
        const archive = await generateArchive(
          {
            name: 'legacy_pack',
            description: 'pack that still carries queries',
            version: '1.0.0',
          },
          [
            // Content packs are structural-only. Older or hand-authored archives may still
            // carry significant-event queries; import must reject them (no partial structural
            // import, no knowledge-indicator writes) so detections are never silently dropped.
            // Cast past the type that no longer allows `queries`.
            {
              type: 'stream',
              name: ROOT_STREAM_ID,
              request: {
                stream: {
                  type: 'wired',
                  description: '',
                  ingest: {
                    processing: { steps: [] },
                    settings: {},
                    wired: {
                      fields: {},
                      routing: [
                        { destination: 'detector', where: { never: {} }, status: 'disabled' },
                      ],
                    },
                    lifecycle: { inherit: {} },
                    failure_store: { inherit: {} },
                  },
                },
                ...emptyAssets,
                queries: [
                  {
                    id: 'legacy-query',
                    type: 'match',
                    title: 'legacy query',
                    description: '',
                    esql: {
                      query:
                        'FROM logs.otel.branch_e METADATA _id, _source | WHERE KQL("message: ERROR")',
                    },
                  },
                ],
              },
            } as ContentPackStream,
            {
              type: 'stream',
              name: 'detector',
              request: {
                stream: {
                  type: 'wired',
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

        await putStream(apiClient, 'logs.otel.branch_e', upsertRequest({}));

        const response = await importContent(
          apiClient,
          'logs.otel.branch_e',
          {
            include: { objects: { all: {} } },
            content: Readable.from(archive),
            filename: 'legacy_pack-1.0.0.zip',
          },
          400
        );

        expect((response as unknown as { message: string }).message).to.contain(
          'contains significant-event queries'
        );

        // the rejected import must not partially create any streams
        await getStream(apiClient, 'logs.otel.branch_e.detector', 404);
      });

      it('rejects an empty `queries: []` carried by a pack', async () => {
        const archive = await generateArchive(
          {
            name: 'empty_queries_pack',
            description: 'pack carrying an empty queries array',
            version: '1.0.0',
          },
          [
            // Content packs are structural-only and tech preview, so import hard-fails on any
            // `queries` field rather than half-supporting a legacy shape; even an empty
            // `queries: []` is rejected. Cast past the type that no longer allows `queries`.
            {
              type: 'stream',
              name: ROOT_STREAM_ID,
              request: {
                stream: {
                  type: 'wired',
                  description: '',
                  ingest: {
                    processing: { steps: [] },
                    settings: {},
                    wired: {
                      fields: {},
                      routing: [{ destination: 'child', where: { never: {} }, status: 'disabled' }],
                    },
                    lifecycle: { inherit: {} },
                    failure_store: { inherit: {} },
                  },
                },
                ...emptyAssets,
                queries: [],
              },
            } as ContentPackStream,
            {
              type: 'stream',
              name: 'child',
              request: {
                stream: {
                  type: 'wired',
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

        await putStream(apiClient, 'logs.otel.branch_f', upsertRequest({}));

        const response = await importContent(
          apiClient,
          'logs.otel.branch_f',
          {
            include: { objects: { all: {} } },
            content: Readable.from(archive),
            filename: 'empty_queries_pack-1.0.0.zip',
          },
          400
        );

        expect((response as unknown as { message: string }).message).to.contain(
          'contains significant-event queries'
        );

        // the rejected import must not partially create any streams
        await getStream(apiClient, 'logs.otel.branch_f.child', 404);
      });

      it('rejects significant-event queries at preview time', async () => {
        const archive = await generateArchive(
          {
            name: 'legacy_preview_pack',
            description: 'pack that still carries queries',
            version: '1.0.0',
          },
          [
            // Preview shares the parse path with import, so a pack carrying queries must be
            // rejected before the UI can render it. Cast past the type that no longer allows
            // `queries`.
            {
              type: 'stream',
              name: ROOT_STREAM_ID,
              request: {
                stream: {
                  type: 'wired',
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
                queries: [
                  {
                    id: 'legacy-query',
                    type: 'match',
                    title: 'legacy query',
                    description: '',
                    esql: {
                      query: 'FROM logs.otel METADATA _id, _source | WHERE KQL("message: ERROR")',
                    },
                  },
                ],
              },
            } as ContentPackStream,
          ]
        );

        const response = await previewContent(
          apiClient,
          'logs.otel',
          {
            content: Readable.from(archive),
            filename: 'legacy_preview_pack-1.0.0.zip',
          },
          400
        );

        expect((response as unknown as { message: string }).message).to.contain(
          'contains significant-event queries'
        );
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
                    type: 'wired',
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

        const targetStreamName = 'logs.otel.branch_a';

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
          'Cannot change mapping of [resource.attributes.foo.bar] for [logs.otel.branch_a]'
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
          'Cannot change mapping of [resource.attributes.foo.bar] for [logs.otel.branch_a]'
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
        const targetStreamName = 'logs.otel.overlapping.child';
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
                  type: 'wired',
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
                  type: 'wired',
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
          'logs.otel.overlapping',
          {
            include: { objects: { all: {} } },
            content: Readable.from(archive),
            filename: 'overlap-1.0.0.zip',
          },
          409
        );

        expect((response as unknown as { message: string }).message).to.eql(
          '[logs.otel.overlapping.child] already exists'
        );
      });
    });
  });
}
