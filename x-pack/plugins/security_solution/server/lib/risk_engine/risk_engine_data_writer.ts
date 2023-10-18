/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkOperationContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import type { IdentifierType, RiskScore } from '../../../common/risk_engine';

interface WriterBulkResponse {
  errors: string[];
  docs_written: number;
  took: number;
}

interface BulkParams {
  host?: RiskScore[];
  user?: RiskScore[];
}

export interface RiskEngineDataWriter {
  bulk: (params: BulkParams) => Promise<WriterBulkResponse>;
}

interface RiskEngineDataWriterOptions {
  esClient: ElasticsearchClient;
  index: string;
  namespace: string;
  logger: Logger;
}

export class RiskEngineDataWriter implements RiskEngineDataWriter {
  constructor(private readonly options: RiskEngineDataWriterOptions) {}

  public bulk = async (params: BulkParams) => {
    try {
      if (!params.host?.length && !params.user?.length) {
        return { errors: [], docs_written: 0, took: 0 };
      }

      const { errors, items, took } = await this.options.esClient.bulk({
        operations: this.buildBulkOperations(params),
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

  private buildBulkOperations = (params: BulkParams): BulkOperationContainer[] => {
    const hostBody =
      params.host?.flatMap((score) => [
        { create: { _index: this.options.index } },
        this.scoreToEcs(score, 'host'),
      ]) ?? [];

    const userBody =
      params.user?.flatMap((score) => [
        { create: { _index: this.options.index } },
        this.scoreToEcs(score, 'user'),
      ]) ?? [];

    return hostBody.concat(userBody) as BulkOperationContainer[];
  };

  private scoreToEcs = (score: RiskScore, identifierType: IdentifierType): unknown => {
    const { '@timestamp': _, ...rest } = score;
    return {
      '@timestamp': score['@timestamp'],
      [identifierType]: {
        name: score.id_value,
        risk: {
          ...rest,
        },
      },
    };
  };
}
