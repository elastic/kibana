/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { getSpacesWithNonMigratedSignals } from '../../../lib/detection_engine/migrations/signals/get_spaces_with_non_migrated_signals';
import type { LegacySiemSignals } from './types';

export interface GetLegacySiemSignalsUsageOptions {
  signalsIndex: string;
  esClient: ElasticsearchClient;
  logger: Logger;
}

export const getLegacySiemSignalsUsage = async ({
  signalsIndex,
  esClient,
  logger,
}: GetLegacySiemSignalsUsageOptions): Promise<LegacySiemSignals> => {
  const { indices, spaces } = await getSpacesWithNonMigratedSignals({
    esClient,
    signalsIndex,
  });

  return {
    indices_total: indices.length,
    spaces_total: spaces.length,
  };
};
