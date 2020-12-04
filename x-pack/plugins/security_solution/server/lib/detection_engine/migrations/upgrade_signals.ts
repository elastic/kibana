/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchClient } from 'src/core/server';
import { createSignalsUpgradeIndex } from './create_signals_upgrade_index';

export const upgradeSignals = async ({
  esClient,
  index,
  version,
}: {
  esClient: ElasticsearchClient;
  index: string;
  version: number;
}): Promise<{ destinationIndex: string; sourceIndex: string; taskId: string }> => {
  const upgradeIndex = await createSignalsUpgradeIndex({
    esClient,
    index,
    version,
  });

  // TODO batch size?
  const response = await esClient.reindex<{ task: string }>({
    body: {
      dest: { index: upgradeIndex },
      source: { index },
      script: {
        lang: 'painless',
        source: `
                if (ctx._source.signal._meta == null) {
                  ctx._source.signal._meta = [:];
                }
                ctx._source.signal._meta.schema_version = params.version;
              `,
        params: {
          version,
        },
      },
    },
    refresh: true,
    wait_for_completion: false,
  });

  return {
    destinationIndex: upgradeIndex,
    sourceIndex: index,
    taskId: response.body.task,
  };
};
