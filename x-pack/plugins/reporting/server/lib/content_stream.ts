/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import type { ElasticsearchClient } from 'src/core/server';
import { ReportDocument } from '../../common/types';

type SearchRequest = Required<Parameters<ElasticsearchClient['search']>>[0];

export interface ContentStreamDocument {
  id: string;
  index: string;
}

export class ContentStream extends Readable {
  constructor(private client: ElasticsearchClient, private document: ContentStreamDocument) {
    super();
  }

  async _read() {
    const { id, index } = this.document;
    const body: SearchRequest['body'] = {
      _source: { includes: ['output.content'] },
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
        this.push(output);
      }

      this.push(null);
    } catch (error) {
      this.destroy(error);
    }
  }

  async toString(): Promise<string> {
    let result = '';

    for await (const chunk of this) {
      result += chunk;
    }

    return result;
  }
}
