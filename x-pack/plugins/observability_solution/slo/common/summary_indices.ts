/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetSLOSettingsResponse } from '@kbn/slo-schema';
import { SLO_SUMMARY_DESTINATION_INDEX_PATTERN } from './constants';

export const getListOfSloSummaryIndices = (
  settings: GetSLOSettingsResponse,
  clustersByName: Array<{ name: string; isConnected: boolean }> = []
): string[] => {
  const { useAllRemoteClusters, selectedRemoteClusters } = settings;
  if (!useAllRemoteClusters && selectedRemoteClusters.length === 0) {
    return [SLO_SUMMARY_DESTINATION_INDEX_PATTERN];
  }

  if (useAllRemoteClusters) {
    return [SLO_SUMMARY_DESTINATION_INDEX_PATTERN, `*:${SLO_SUMMARY_DESTINATION_INDEX_PATTERN}`];
  }

  return clustersByName.reduce(
    (acc, { name, isConnected }) => {
      if (isConnected && selectedRemoteClusters.includes(name)) {
        acc.push(`${name}:${SLO_SUMMARY_DESTINATION_INDEX_PATTERN}`);
      }
      return acc;
    },
    [SLO_SUMMARY_DESTINATION_INDEX_PATTERN]
  );
};
