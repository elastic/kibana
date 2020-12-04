/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchClient } from 'src/core/server';
import { createSignalsUpgradeIndex } from './create_signals_upgrade_index';
import { getMigrationStatus } from './get_migration_status';
import { indexNeedsUpgrade, signalsNeedUpgrade } from './helpers';

export const upgradeSignals = async ({
  esClient,
  index,
  version,
}: {
  esClient: ElasticsearchClient;
  index: string;
  version: number;
}): Promise<string> => {
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
    },
    refresh: true,
    wait_for_completion: false,
  });

  return response.body.task;
};
