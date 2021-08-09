/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Duplex } from 'stream';
import type { ElasticsearchClient } from 'src/core/server';
import { ReportingCore } from '..';
import { ReportDocument, ReportSource } from '../../common/types';
import { ExportTypesRegistry } from './export_types_registry';

type Callback = (error?: Error) => void;
type SearchRequest = Required<Parameters<ElasticsearchClient['search']>>[0];

interface ContentStreamDocument {
  id: string;
  index: string;
  if_primary_term?: number;
  if_seq_no?: number;
}

export class ContentStream extends Duplex {
  private buffer = Buffer.from('');
  private jobContentEncoding?: string;
  private jobType?: string;
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

  async _read() {
    const { id, index } = this.document;
    const body: SearchRequest['body'] = {
      _source: { includes: ['output.content', 'jobtype'] },
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

    try {
      const response = await this.client.search({ body, index });
      const hits = response?.body.hits?.hits?.[0] as ReportDocument | undefined;
      const output = hits?._source.output?.content;
      this.jobType = hits?._source.jobtype;

      if (output != null) {
        this.push(await this.decode(output));
      }

      this.push(null);
    } catch (error) {
      this.destroy(error);
    }
  }

  _write(chunk: Buffer | string, encoding: BufferEncoding, callback: Callback) {
    this.buffer = Buffer.concat([
      this.buffer,
      Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding),
    ]);
    callback();
  }

  async _final(callback: Callback) {
    try {
      const content = await this.encode(this.buffer);
      const { body } = await this.client.update<ReportDocument>({
        ...this.document,
        body: {
          doc: {
            output: { content },
          },
        },
      });

      ({ _primary_term: this.primaryTerm, _seq_no: this.seqNo } = body);
      this.bytesWritten += this.buffer.byteLength;
      this.buffer = Buffer.from('');
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

  return new ContentStream(client, exportTypesRegistry, document);
}
