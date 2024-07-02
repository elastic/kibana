/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Duplex } from 'stream';
import { v4 as uuidv4 } from 'uuid';

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ReportSource } from '@kbn/reporting-common/types';
import {
  REPORTING_DATA_STREAM_ALIAS,
  REPORTING_DATA_STREAM_WILDCARD_WITH_LEGACY,
} from '@kbn/reporting-server';
import type { ReportingCore } from '..';

const ONE_MB = 1024 * 1024;

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
  '@timestamp': string;
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
  private buffers: Buffer[] = [];
  private bytesBuffered = 0;

  private bytesRead = 0;
  private chunksRead = 0;
  private chunksWritten = 0;
  private jobSize?: number;
  private parameters: Required<ContentStreamParameters>;
  private primaryTerm?: number;
  private seqNo?: number;

  /**
   * The number of bytes written so far.
   * Does not include data that is still queued for writing.
   */
  bytesWritten = 0;

  /**
   * The chunking size of reporting files. Larger CSV files will be split into
   * multiple documents, where the stream is chunked into pieces of approximately
   * this size. The actual document size will be slightly larger due to Base64
   * encoding and JSON metadata.
   */
  chunkSize = 4 * ONE_MB;

  constructor(
    private client: ElasticsearchClient,
    private logger: Logger,
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

  private async readHead() {
    const { id, index } = this.document;
    const body: SearchRequest = {
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
    const hits = response?.hits?.hits?.[0];

    this.jobSize = hits?._source?.output?.size;
    this.logger.debug(`Reading job of size ${this.jobSize}`);

    return hits?._source?.output?.content;
  }

  private async readChunk() {
    const { id } = this.document;
    const body: SearchRequest = {
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

    const response = await this.client.search<ChunkSource>({
      body,
      index: REPORTING_DATA_STREAM_WILDCARD_WITH_LEGACY,
    });
    const hits = response?.hits?.hits?.[0];

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
    this.logger.debug(`Updating chunk #0 (${this.document.id}).`);

    const body = await this.client.update<ReportSource>({
      ...this.document,
      refresh: 'wait_for',
      body: {
        doc: {
          output: { content },
        },
      },
    });

    ({ _primary_term: this.primaryTerm, _seq_no: this.seqNo } = body);
  }

  private async writeChunk(content: string) {
    const { id: parentId } = this.document;
    const id = uuidv4();

    this.logger.debug(`Writing chunk #${this.chunksWritten} (${id}).`);

    await this.client.index<ChunkSource>({
      id,
      index: REPORTING_DATA_STREAM_ALIAS,
      refresh: 'wait_for',
      op_type: 'create',
      body: {
        parent_id: parentId,
        '@timestamp': new Date(0).toISOString(), // required for data streams compatibility
        output: {
          content,
          chunk: this.chunksWritten,
        },
      },
    });
  }

  private async flush(size = this.bytesBuffered) {
    const buffersToFlush: Buffer[] = [];
    let bytesToFlush = 0;

    /*
     Loop over each buffer, keeping track of how many bytes we have added
     to the array of buffers to be flushed. The array of buffers to be flushed
     contains buffers by reference, not copies. This avoids putting pressure on
     the CPU for copying buffers or for gc activity. Please profile performance
     with a large byte configuration and a large number of records (900k+)
     before changing this code. Config used at time of writing:

      xpack.reporting:
        csv.maxSizeBytes: 500000000
        csv.scroll.size: 1000

     At the moment this can put memory pressure on Kibana. Up to 1,1 GB in a dev
     build. It is not recommended to have overly large max size bytes but we
     need this code to be as performant as possible.
    */
    while (this.buffers.length) {
      const remainder = size - bytesToFlush;
      if (remainder <= 0) {
        break;
      }
      const buffer = this.buffers.shift()!;
      const chunkedBuffer = buffer.slice(0, remainder);
      buffersToFlush.push(chunkedBuffer);
      bytesToFlush += chunkedBuffer.byteLength;

      if (buffer.byteLength > remainder) {
        this.buffers.unshift(buffer.slice(remainder));
      }
    }

    // We call Buffer.concat with the fewest number of buffers possible
    const chunk = Buffer.concat(buffersToFlush);
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
    this.bytesBuffered -= bytesToFlush;
  }

  private async flushAllFullChunks() {
    while (this.bytesBuffered >= this.chunkSize && this.buffers.length) {
      await this.flush(this.chunkSize);
    }
  }

  _write(chunk: Buffer | string, encoding: BufferEncoding, callback: Callback) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding);
    this.bytesBuffered += buffer.byteLength;
    this.buffers.push(buffer);

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
    logger.get('content_stream').get(document.id),
    document,
    parameters
  );
}
