/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { EsqlDocument, EsqlHit } from '../../common/types';

interface EsqlResultColumn {
  name: string;
  type: string;
}

type EsqlResultRow = Array<string | null>;

interface EsqlQueryResponse {
  columns: EsqlResultColumn[];
  values: EsqlResultRow[];
}

export class EsqlTransport {
  constructor(private esClient: ElasticsearchClient) {}

  query(query: string) {
    return this.esClient.esql
      .query({ query })
      .then((table) => EsqlTable.create(table as unknown as EsqlQueryResponse));
  }
}

const ESQL_DOCUMENT_ID = 'esql_query_document';

class EsqlTable {
  private constructor(private columns: EsqlResultColumn[], private values: EsqlResultRow[]) {}

  getValues() {
    return this.values.flat();
  }

  toDocuments() {
    const hits: EsqlHit[] = this.values.map((row) => {
      const document = EsqlTable.rowToDocument(this.columns, row);
      return {
        _id: ESQL_DOCUMENT_ID,
        _index: '',
        _source: document,
      };
    });

    return {
      hits,
      total: hits.length,
    };
  }

  static rowToDocument(columns: EsqlResultColumn[], row: EsqlResultRow): EsqlDocument {
    return columns.reduce<Record<string, string | null>>((acc, column, i) => {
      acc[column.name] = row[i];

      return acc;
    }, {});
  }

  public static create({ columns, values }: EsqlQueryResponse) {
    return new EsqlTable(columns, values);
  }
}
