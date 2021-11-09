/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Duplex } from 'stream';
import { defaults, get } from 'lodash';
import Puid from 'puid';
import { ByteSizeValue } from '@kbn/config-schema';
import type { ElasticsearchClient } from 'src/core/server';
import { ReportingCore } from '..';
import { ReportSource } from '../../common/types';
import { LevelLogger } from './level_logger';

/**
 * @note The Elasticsearch `http.max_content_length` is including the whole POST body.
 * But the update/index request also contains JSON-serialized query parameters.
 * 1Kb span should be enough for that.
 */
const REQUEST_SPAN_SIZE_IN_BYTES = 1024;

type Callback = (error?: Error) => void;
type SearchRequest = estypes.SearchRequest;

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

type ContentStreamEncoding = 'base64' | 'raw';

interface ContentStreamParameters {
  /**
   * Content encoding. By default, it is Base64.
   */
  encoding?: ContentStreamEncoding;
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
  private jobSize?: number;
  private maxChunkSize?: number;
  private parameters: Required<ContentStreamParameters>;
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
    private logger: LevelLogger,
    private document: ContentStreamDocument,
    { encoding = 'base64' }: ContentStreamParameters = {}
  ) {
    super();
    this.parameters = { encoding };
  }

  private decode(content: string) {
    return Buffer.from(content, this.parameters.encoding === 'base64' ? 'base64' : undefined);
  }

  private encode(buffer: Buffer) {
    return buffer.toString(this.parameters.encoding === 'base64' ? 'base64' : undefined);
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

      this.maxChunkSize =
        this.parameters.encoding === 'base64'
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

  _read() {
    (this.chunksRead ? this.readChunk() : this.readHead())
      .then((content) => {
        if (!content) {
          this.logger.debug(`Chunk is empty.`);
          this.push(null);
          return;
        }

        const buffer = this.decode(content);

        this.push(buffer);
        this.chunksRead++;
        this.bytesRead += buffer.byteLength;

        if (this.isRead()) {
          this.logger.debug(`Read ${this.bytesRead} of ${this.jobSize} bytes.`);
          this.push(null);
        }
      })
      .catch((err) => this.destroy(err));
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
    const content = this.encode(chunk);

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

  private async flushAllFullChunks() {
    const maxChunkSize = await this.getMaxChunkSize();

    while (this.buffer.byteLength >= maxChunkSize) {
      await this.flush(maxChunkSize);
    }
  }

  _write(chunk: Buffer | string, encoding: BufferEncoding, callback: Callback) {
    this.buffer = Buffer.concat([
      this.buffer,
      Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding),
    ]);

    this.flushAllFullChunks()
      .then(() => callback())
      .catch(callback);
  }

  _final(callback: Callback) {
    this.flush()
      .then(() => callback())
      .catch(callback);
  }

  getSeqNo(): number | undefined {
    return this.seqNo;
  }

  getPrimaryTerm(): number | undefined {
    return this.primaryTerm;
  }
}

export async function getContentStream(
  reporting: ReportingCore,
  document: ContentStreamDocument,
  parameters?: ContentStreamParameters
) {
  const { asInternalUser: client } = await reporting.getEsClient();
  const { logger } = reporting.getPluginSetupDeps();

  return new ContentStream(
    client,
    logger.clone(['content_stream', document.id]),
    document,
    parameters
  );
}
