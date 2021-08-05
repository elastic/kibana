/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Duplex } from 'stream';
import type { ElasticsearchClient } from 'src/core/server';
import { ReportingCore } from '..';
import { ReportDocument } from '../../common/types';
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
  private buffer = '';
  private primaryTerm?: number;
  private seqNo?: number;

  constructor(
    private client: ElasticsearchClient,
    private exportTypesRegistry: ExportTypesRegistry,
    private document: ContentStreamDocument
  ) {
    super();
  }

  private getContentEncoding(jobType: string) {
    const { jobContentEncoding } = this.exportTypesRegistry.get(
      ({ jobType: item }) => item === jobType
    );

    return jobContentEncoding;
  }

  private decodeContent(content: string, jobType: string) {
    const contentEncoding = this.getContentEncoding(jobType);

    return contentEncoding === 'base64' ? Buffer.from(content, 'base64') : content;
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

      if (output != null) {
        this.push(this.decodeContent(output, hits!._source.jobtype));
      }

      this.push(null);
    } catch (error) {
      this.destroy(error);
    }
  }

  _write(chunk: Buffer | string, _encoding: string, callback: Callback) {
    this.buffer += typeof chunk === 'string' ? chunk : chunk.toString();
    callback();
  }

  async _final(callback: Callback) {
    try {
      const { body } = await this.client.update<ReportDocument>({
        ...this.document,
        body: {
          doc: {
            output: {
              content: this.buffer,
            },
          },
        },
      });

      ({ _primary_term: this.primaryTerm, _seq_no: this.seqNo } = body);
      this.buffer = '';
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
