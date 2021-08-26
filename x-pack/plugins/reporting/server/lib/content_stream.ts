/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Duplex } from 'stream';
import { defaults, get } from 'lodash';
import Puid from 'puid';
import { ByteSizeValue } from '@kbn/config-schema';
import type { ElasticsearchClient } from 'src/core/server';
import { ReportingCore } from '..';
import { ReportSource } from '../../common/types';
import { ExportTypesRegistry } from './export_types_registry';
import { LevelLogger } from './level_logger';

/**
 * @note The Elasticsearch `http.max_content_length` is including the whole POST body.
 * But the update/index request also contains JSON-serialized query parameters.
 * 1Kb span should be enough for that.
 */
const REQUEST_SPAN_SIZE_IN_BYTES = 1024;

type Callback = (error?: Error) => void;
type SearchRequest = Required<Parameters<ElasticsearchClient['search']>>[0];

interface ContentStreamDocument {
  id: string;
  index: string;
  if_primary_term?: number;
  if_seq_no?: number;
}

interface ChunkOutput {
  chunk: number;
  content: string;
}

interface ChunkSource {
  parent_id: string;
  output: ChunkOutput;
}

export class ContentStream extends Duplex {
  /**
   * @see https://en.wikipedia.org/wiki/Base64#Output_padding
   */
  private static getMaxBase64EncodedSize(max: number) {
    return Math.floor(max / 4) * 3;
  }

  /**
   * @note Raw data might be escaped during JSON serialization.
   * In the worst-case, every character is escaped, so the max raw data length is twice less.
   */
  private static getMaxJsonEscapedSize(max: number) {
    return Math.floor(max / 2);
  }

  private buffer = Buffer.from('');
  private bytesRead = 0;
  private chunksRead = 0;
  private chunksWritten = 0;
  private jobContentEncoding?: string;
  private jobSize?: number;
  private jobType?: string;
  private maxChunkSize?: number;
  private puid = new Puid();
  private primaryTerm?: number;
  private seqNo?: number;

  /**
   * The number of bytes written so far.
   * Does not include data that is still queued for writing.
   */
  bytesWritten = 0;

  constructor(
    private client: ElasticsearchClient,
    private exportTypesRegistry: ExportTypesRegistry,
    private logger: LevelLogger,
    private document: ContentStreamDocument
  ) {
    super();
  }

  private async getJobType() {
    if (!this.jobType) {
      const { id, index } = this.document;
      const body: SearchRequest['body'] = {
        _source: { includes: ['jobtype'] },
        query: {
          constant_score: {
            filter: {
              bool: {
                must: [{ term: { _id: id } }],
              },
            },
          },
        },
        size: 1,
      };

      const response = await this.client.search<ReportSource>({ body, index });
      const hits = response?.body.hits?.hits?.[0];
      this.jobType = hits?._source?.jobtype;
    }

    return this.jobType;
  }

  private async getJobContentEncoding() {
    if (!this.jobContentEncoding) {
      const jobType = await this.getJobType();

      ({ jobContentEncoding: this.jobContentEncoding } = this.exportTypesRegistry.get(
        ({ jobType: item }) => item === jobType
      ));
    }

    return this.jobContentEncoding;
  }

  private async decode(content: string) {
    const contentEncoding = await this.getJobContentEncoding();

    return Buffer.from(content, contentEncoding === 'base64' ? 'base64' : undefined);
  }

  private async encode(buffer: Buffer) {
    const contentEncoding = await this.getJobContentEncoding();

    return buffer.toString(contentEncoding === 'base64' ? 'base64' : undefined);
  }

  private async getMaxContentSize() {
    const { body } = await this.client.cluster.getSettings({ include_defaults: true });
    const { persistent, transient, defaults: defaultSettings } = body;
    const settings = defaults({}, persistent, transient, defaultSettings);
    const maxContentSize = get(settings, 'http.max_content_length', '100mb');

    return ByteSizeValue.parse(maxContentSize).getValueInBytes();
  }

  private async getMaxChunkSize() {
    if (!this.maxChunkSize) {
      const maxContentSize = (await this.getMaxContentSize()) - REQUEST_SPAN_SIZE_IN_BYTES;
      const jobContentEncoding = await this.getJobContentEncoding();

      this.maxChunkSize =
        jobContentEncoding === 'base64'
          ? ContentStream.getMaxBase64EncodedSize(maxContentSize)
          : ContentStream.getMaxJsonEscapedSize(maxContentSize);

      this.logger.debug(`Chunk size is ${this.maxChunkSize} bytes.`);
    }

    return this.maxChunkSize;
  }

  private async readHead() {
    const { id, index } = this.document;
    const body: SearchRequest['body'] = {
      _source: { includes: ['output.content', 'output.size', 'jobtype'] },
      query: {
        constant_score: {
          filter: {
            bool: {
              must: [{ term: { _id: id } }],
            },
          },
        },
      },
      size: 1,
    };

    this.logger.debug(`Reading report contents.`);

    const response = await this.client.search<ReportSource>({ body, index });
    const hits = response?.body.hits?.hits?.[0];

    this.jobType = hits?._source?.jobtype;
    this.jobSize = hits?._source?.output?.size;

    return hits?._source?.output?.content;
  }

  private async readChunk() {
    const { id, index } = this.document;
    const body: SearchRequest['body'] = {
      _source: { includes: ['output.content'] },
      query: {
        constant_score: {
          filter: {
            bool: {
              must: [{ term: { parent_id: id } }, { term: { 'output.chunk': this.chunksRead } }],
            },
          },
        },
      },
      size: 1,
    };

    this.logger.debug(`Reading chunk #${this.chunksRead}.`);

    const response = await this.client.search<ChunkSource>({ body, index });
    const hits = response?.body.hits?.hits?.[0];

    return hits?._source?.output.content;
  }

  private isRead() {
    return this.jobSize != null && this.bytesRead >= this.jobSize;
  }

  async _read() {
    try {
      const content = this.chunksRead ? await this.readChunk() : await this.readHead();
      if (!content) {
        this.logger.debug(`Chunk is empty.`);
        this.push(null);
        return;
      }

      const buffer = await this.decode(content);

      this.push(buffer);
      this.chunksRead++;
      this.bytesRead += buffer.byteLength;

      if (this.isRead()) {
        this.logger.debug(`Read ${this.bytesRead} of ${this.jobSize} bytes.`);
        this.push(null);
      }
    } catch (error) {
      this.destroy(error);
    }
  }

  private async removeChunks() {
    const { id, index } = this.document;

    await this.client.deleteByQuery({
      index,
      body: {
        query: {
          match: { parent_id: id },
        },
      },
    });
  }

  private async writeHead(content: string) {
    this.logger.debug(`Updating report contents.`);

    const { body } = await this.client.update<ReportSource>({
      ...this.document,
      body: {
        doc: {
          output: { content },
        },
      },
    });

    ({ _primary_term: this.primaryTerm, _seq_no: this.seqNo } = body);
  }

  private async writeChunk(content: string) {
    const { id: parentId, index } = this.document;
    const id = this.puid.generate();

    this.logger.debug(`Writing chunk #${this.chunksWritten} (${id}).`);

    await this.client.index<ChunkSource>({
      id,
      index,
      body: {
        parent_id: parentId,
        output: {
          content,
          chunk: this.chunksWritten,
        },
      },
    });
  }

  private async flush(size = this.buffer.byteLength) {
    const chunk = this.buffer.slice(0, size);
    const content = await this.encode(chunk);

    if (!this.chunksWritten) {
      await this.removeChunks();
      await this.writeHead(content);
    } else if (chunk.byteLength) {
      await this.writeChunk(content);
    }

    if (chunk.byteLength) {
      this.chunksWritten++;
    }

    this.bytesWritten += chunk.byteLength;
    this.buffer = this.buffer.slice(size);
  }

  async _write(chunk: Buffer | string, encoding: BufferEncoding, callback: Callback) {
    this.buffer = Buffer.concat([
      this.buffer,
      Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding),
    ]);

    try {
      const maxChunkSize = await this.getMaxChunkSize();

      while (this.buffer.byteLength >= maxChunkSize) {
        await this.flush(maxChunkSize);
      }

      callback();
    } catch (error) {
      callback(error);
    }
  }

  async _final(callback: Callback) {
    try {
      await this.flush();
      callback();
    } catch (error) {
      callback(error);
    }
  }

  getSeqNo(): number | undefined {
    return this.seqNo;
  }

  getPrimaryTerm(): number | undefined {
    return this.primaryTerm;
  }
}

export async function getContentStream(reporting: ReportingCore, document: ContentStreamDocument) {
  const { asInternalUser: client } = await reporting.getEsClient();
  const exportTypesRegistry = reporting.getExportTypesRegistry();
  const { logger } = reporting.getPluginSetupDeps();

  return new ContentStream(
    client,
    exportTypesRegistry,
    logger.clone(['content_stream', document.id]),
    document
  );
}
