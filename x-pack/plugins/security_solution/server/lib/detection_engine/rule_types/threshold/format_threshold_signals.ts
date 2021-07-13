/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 } from 'uuid';
import { SearchHit } from '@elastic/elasticsearch/api/types';
import { transformThresholdResultsToEcs } from '../../signals/threshold';
import { SignalSource } from '../../signals/types';
import { BulkCreateThresholdSignalParams } from './types';

export const formatThresholdSignals = (
  params: BulkCreateThresholdSignalParams
): Array<SearchHit<SignalSource>> => {
  const { index, threshold } = params.ruleParams;
  const thresholdResults = params.results;
  const results = transformThresholdResultsToEcs(
    thresholdResults,
    (index ?? []).join(','),
    params.startedAt,
    params.from,
    undefined,
    params.services.logger,
    threshold,
    params.ruleId,
    undefined,
    params.thresholdSignalHistory
  );
  return results.hits.hits.map((hit) => {
    return {
      ...hit,
      'event.kind': 'signal',
      'kibana.rac.alert.id': '???',
      'kibana.rac.alert.uuid': v4(),
      '@timestamp': new Date().toISOString(),
    };
  });
};
