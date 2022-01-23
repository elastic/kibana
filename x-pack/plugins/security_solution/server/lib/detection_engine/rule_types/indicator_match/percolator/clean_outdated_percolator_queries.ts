/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';

export interface CleanOutdatedPercolatorQueriesOptions {
  esClient: ElasticsearchClient;
  percolatorIndexName: string;
  ruleId: string;
  ruleVersion: number;
}

export const cleanOutdatedPercolatorQueries = async ({
  esClient,
  percolatorIndexName,
  ruleId,
  ruleVersion,
}: CleanOutdatedPercolatorQueriesOptions) => {
  esClient.deleteByQuery({
    index: percolatorIndexName,
    body: {
      query: {
        bool: {
          should: [
            {
              match: {
                rule_id: ruleId,
              },
            },
            {
              range: {
                rule_version: {
                  gt: 0,
                  lt: ruleVersion,
                },
              },
            },
          ],
          minimum_should_match: 2,
        },
      },
    },
  });
};
