/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { errors as esErrors } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { ByteSizeValue } from '@kbn/config-schema';
import { defaults } from 'lodash';
import Puid from 'puid';
import { Duplex, Writable, Readable } from 'stream';

import type { FileChunkDocument } from '../mappings';

/**
 * @note The Elasticsearch `http.max_content_length` is including the whole POST body.
 * But the update/index request also contains JSON-serialized query parameters.
 * 1Kb span should be enough for that.
 */
const REQUEST_SPAN_SIZE_IN_BYTES = 1024;

type Callback = (error?: Error) => void;

export type ContentStreamEncoding = 'base64' | 'raw';

export interface ContentStreamParameters {
  /**
   * The maximum size allowed per chunk.
   *
   * @default 4mb
   */
  maxChunkSize?: string;
  /**
   * The file size in bytes. This can be used to optimize downloading.
   */
  size?: number;
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

  private buffers: Buffer[] = [];
  private bytesBuffered = 0;

  private bytesRead = 0;
  private chunksRead = 0;
  private chunksWritten = 0;
  private maxChunkSize?: number;
  private parameters: Required<ContentStreamParameters>;
  private puid = new Puid();

  /**
   * The number of bytes written so far.
   * Does not include data that is still queued for writing.
   */
  bytesWritten = 0;

  constructor(
    private client: ElasticsearchClient,
    private id: undefined | string,
    private index: string,
    private logger: Logger,
    parameters: ContentStreamParameters = {}
  ) {
    super();
    this.parameters = defaults(parameters, { encoding: 'base64', size: -1, maxChunkSize: '4mb' });
  }

  private decode(content: string) {
    return Buffer.from(content, this.parameters.encoding === 'base64' ? 'base64' : undefined);
  }

  private encode(buffer: Buffer) {
    return buffer.toString(this.parameters.encoding === 'base64' ? 'base64' : undefined);
  }

  private getMaxContentSize(): number {
    return ByteSizeValue.parse(this.parameters.maxChunkSize).getValueInBytes();
  }

  private getMaxChunkSize() {
    if (!this.maxChunkSize) {
      const maxContentSize = this.getMaxContentSize() - REQUEST_SPAN_SIZE_IN_BYTES;

      this.maxChunkSize =
        this.parameters.encoding === 'base64'
          ? ContentStream.getMaxBase64EncodedSize(maxContentSize)
          : ContentStream.getMaxJsonEscapedSize(maxContentSize);

      this.logger.debug(`Chunk size is ${this.maxChunkSize} bytes.`);
    }

    return this.maxChunkSize;
  }

  private async readChunk() {
    if (!this.id) {
      throw new Error('No document ID provided. Cannot read chunk.');
    }
    const id = this.getChunkId(this.chunksRead);

    this.logger.debug(`Reading chunk #${this.chunksRead}.`);

    try {
      const response = await this.client.get<FileChunkDocument>({
        id,
        index: this.index,
        _source_includes: ['content'],
      });
      return response?._source?.content;
    } catch (e) {
      if (e instanceof esErrors.ResponseError && e.statusCode === 404) {
        const readingHeadChunk = this.chunksRead <= 0;
        if (this.isSizeUnknown() && !readingHeadChunk) {
          // Assume there is no more content to read.
          return null;
        }
        if (readingHeadChunk) {
          this.logger.error(`File not found (id: ${this.getHeadChunkId()}).`);
        }
      }
      throw e;
    }
  }

  private isSizeUnknown(): boolean {
    return this.parameters.size < 0;
  }

  private isRead() {
    const { size } = this.parameters;
    if (size > 0) {
      return this.bytesRead >= size;
    }
    return false;
  }

  _read() {
    this.readChunk()
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
          this.logger.debug(`Read ${this.bytesRead} of ${this.parameters.size} bytes.`);
          this.push(null);
        }
      })
      .catch((err) => this.destroy(err));
  }

  private async removeChunks() {
    const id = this.getHeadChunkId();
    this.logger.debug(`Clearing existing chunks for ${id}`);
    await this.client.deleteByQuery({
      index: this.index,
      query: {
        bool: {
          should: [{ match: { head_chunk_id: id } }, { match: { _id: id } }],
          minimum_should_match: 1,
        },
      },
    });
  }

  public getDocumentId(): undefined | string {
    return this.id;
  }

  public getBytesWritten(): number {
    return this.bytesWritten;
  }

  private getHeadChunkId() {
    if (!this.id) {
      this.id = this.puid.generate();
    }
    return this.id;
  }

  private getChunkId(chunkNumber = 0) {
    const id = this.getHeadChunkId();
    return chunkNumber === 0 ? id : `${id}.${chunkNumber}`;
  }

  private async writeChunk(content: string) {
    const chunkId = this.getChunkId(this.chunksWritten);

    this.logger.debug(`Writing chunk #${this.chunksWritten} (${chunkId}).`);

    await this.client.index<FileChunkDocument>({
      id: chunkId,
      index: this.index,
      document: {
        content,
        head_chunk_id: this.chunksWritten > 0 ? this.getHeadChunkId() : undefined,
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
     before changing this code.
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
    }
    if (chunk.byteLength) {
      await this.writeChunk(content);
      this.chunksWritten++;
    }

    this.bytesWritten += chunk.byteLength;
    this.bytesBuffered -= bytesToFlush;
  }

  private async flushAllFullChunks() {
    const maxChunkSize = this.getMaxChunkSize();

    while (this.bytesBuffered >= maxChunkSize && this.buffers.length) {
      await this.flush(maxChunkSize);
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
}

export interface ContentStreamArgs {
  client: ElasticsearchClient;
  /**
   * Provide an Elasticsearch document ID to read from an existing document
   */
  id?: string;

  /**
   * The Elasticsearch index name to read from or write to.
   */
  index: string;

  /**
   * Known size of the file we are reading. This value can be used to optimize
   * reading of the file.
   */
  logger: Logger;
  parameters?: ContentStreamParameters;
}

function getContentStream({ client, id, index, logger, parameters }: ContentStreamArgs) {
  return new ContentStream(client, id, index, logger, parameters);
}

type WritableContentStream = Writable & Pick<ContentStream, 'getDocumentId' | 'getBytesWritten'>;

export function getWritableContentStream(args: ContentStreamArgs): WritableContentStream {
  return getContentStream(args);
}

type ReadableContentStream = Readable;

export function getReadableContentStream(
  args: Omit<ContentStreamArgs, 'id'> & { id: string }
): ReadableContentStream {
  return getContentStream(args);
}
