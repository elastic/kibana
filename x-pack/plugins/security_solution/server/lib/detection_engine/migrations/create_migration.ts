/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'src/core/server';
import { SignalsReindexOptions } from '../../../../common/detection_engine/schemas/request/create_signals_migration_schema';
import { createMigrationIndex } from './create_migration_index';

export interface CreatedMigration {
  destinationIndex: string;
  sourceIndex: string;
  taskId: string;
  version: number;
}

/**
 * Migrates signals for a given concrete index. Signals are reindexed into a
 * new index in order to receive new fields. Migrated signals have a
 * `signal._meta.version` field representing the mappings version at the time of the migration.
 *
 * @param esClient An {@link ElasticsearchClient}
 * @param index name of the concrete signals index to be migrated
 * @param version version of the current signals template/mappings
 * @param reindexOptions object containing reindex options {@link SignalsReindexOptions}
 *
 * @returns identifying information representing the {@link MigrationInfo}
 * @throws if elasticsearch returns an error
 */
export const createMigration = async ({
  esClient,
  index,
  reindexOptions,
  version,
}: {
  esClient: ElasticsearchClient;
  index: string;
  reindexOptions: SignalsReindexOptions;
  version: number;
}): Promise<CreatedMigration> => {
  const migrationIndex = await createMigrationIndex({
    esClient,
    index,
    version,
  });

  const { size, ...reindexQueryOptions } = reindexOptions;

  const response = await esClient.reindex({
    body: {
      dest: { index: migrationIndex },
      source: { index, size },
      script: {
        lang: 'painless',
        source: `
                if (ctx._source.signal._meta == null) {
                  ctx._source.signal._meta = [:];
                }
                ctx._source.signal._meta.version = params.version;

                // migrate enrichments before 7.15 to ECS 1.11
                if (ctx._source.signal?.rule?.type == "threat_match" &&
                ctx._source.threat?.indicator instanceof List &&
                ctx._source.threat?.enrichments == null) {
                  ctx._source.threat.enrichments = [];
                  for (indicator in ctx._source.threat.indicator) {
                    def enrichment = [:];
                    enrichment.indicator = indicator;
                    enrichment.indicator.reference = indicator.event?.reference;
                    enrichment.matched = indicator.matched;
                    enrichment.indicator.remove("matched");
                    ctx._source.threat.enrichments.add(enrichment);
                  }
                  ctx._source.threat.remove("indicator");
                }

                // migrate status
                if(ctx._source.signal?.status == "in-progress") {
                  ctx._source.signal.status = "acknowledged";
                }
                if(ctx._source['kibana.alert.workflow_status'] == "in-progress") {
                  ctx._source['kibana.alert.workflow_status'] = "acknowledged";
                }
              `,
        params: {
          version,
        },
      },
    },
    ...reindexQueryOptions,
    refresh: true,
    wait_for_completion: false,
  });

  return {
    destinationIndex: migrationIndex,
    sourceIndex: index,
    taskId: String(response.task),
    version,
  };
};
