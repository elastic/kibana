/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import util from 'util';
import { Logger, ElasticsearchClient } from 'src/core/server';
import { BufferedStream } from './utils/buffered_stream';

type Document = Record<string, unknown>;

interface BufferItem {
  index: string;
  doc: Document;
}

interface ConstructorParams {
  indexName: string;
  elasticsearch: Promise<ElasticsearchClient>;
  isWriteEnabled: boolean;
  logger: Logger;
}

export type IIndexWriter = PublicMethodsOf<IndexWriter>;

export class IndexWriter {
  private readonly indexName: string;
  private readonly elasticsearch: Promise<ElasticsearchClient>;
  private readonly isWriteEnabled: boolean;
  private readonly logger: Logger;
  private readonly buffer: BufferedStream<BufferItem>;

  constructor(params: ConstructorParams) {
    this.indexName = params.indexName;
    this.elasticsearch = params.elasticsearch;
    this.isWriteEnabled = params.isWriteEnabled;
    this.logger = params.logger.get('IndexWriter');

    this.buffer = new BufferedStream<BufferItem>({
      flush: (items) => this.bulkIndex(items),
    });
  }

  public indexOne(doc: Document): void {
    if (this.isWriteEnabled) {
      this.logger.debug('Buffering 1 document');
      this.buffer.enqueue({ index: this.indexName, doc });
    }
  }

  public indexMany(docs: Document[]): void {
    if (this.isWriteEnabled) {
      this.logger.debug(`Buffering ${docs.length} documents`);
      docs.forEach((doc) => {
        this.buffer.enqueue({ index: this.indexName, doc });
      });
    }
  }

  public async close(): Promise<void> {
    await this.buffer.closeAndWaitUntilFlushed();
  }

  private async bulkIndex(items: BufferItem[]): Promise<void> {
    this.logger.debug(`Indexing ${items.length} documents`);

    const bulkBody: Array<Record<string, unknown>> = [];

    for (const item of items) {
      if (item.doc === undefined) continue;

      bulkBody.push({ create: { _index: item.index, version: 1 } });
      bulkBody.push(item.doc);
    }

    try {
      const es = await this.elasticsearch;
      const response = await es.bulk({ body: bulkBody });

      if (response.body.errors) {
        const error = new Error('Error writing some bulk events');
        error.stack += '\n' + util.inspect(response.body.items, { depth: null });
        this.logger.error(error);
      }
    } catch (e) {
      this.logger.error(
        `error writing bulk events: "${e.message}"; docs: ${JSON.stringify(bulkBody)}`
      );
    }
  }
}
