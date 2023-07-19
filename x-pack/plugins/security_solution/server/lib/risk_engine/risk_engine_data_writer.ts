/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { RiskScore } from './types';

interface WriterBulkResponse {
  errors: string[];
  docs_written: number;
  took: number;
}

export interface RiskEngineDataWriter {
  bulk: (scores: RiskScore[]) => Promise<WriterBulkResponse>;
}
interface RiskEngineDataWriterOptions {
  esClient: ElasticsearchClient;
  index: string;
  namespace: string;
  logger: Logger;
}

export class RiskEngineDataWriter implements RiskEngineDataWriter {
  constructor(private readonly options: RiskEngineDataWriterOptions) {}

  public bulk = async (scores: RiskScore[]) => {
    try {
      const { errors, items, took } = await this.options.esClient.bulk({
        body: scores.flatMap((score) => [{ create: { _index: this.options.index } }, score]),
      });

      return {
        errors: errors
          ? items
              .map((item) => item.create?.error?.reason)
              .filter((error): error is string => !!error)
          : [],
        docs_written: items.filter(
          (item) => item.create?.status === 201 || item.create?.status === 200
        ).length,
        took,
      };
    } catch (e) {
      this.options.logger.error(`Error writing risk scores: ${e.message}`);
      return {
        errors: [`${e.message}`],
        docs_written: 0,
        took: 0,
      };
    }
  };
}
