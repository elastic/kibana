/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import type { CorrelationsParams } from '../../../../common/correlations/types';

import { fetchSpikeAnalysisFrequentItems } from '.';

export const fetchFrequentItems = async (
  esClient: ElasticsearchClient,
  paramsWithIndex: CorrelationsParams,
  fieldCandidates: Array<{ fieldName: string; fieldValue: string | number }>,
  windowParameters: {
    baselineMin: number;
    baselineMax: number;
    deviationMin: number;
    deviationMax: number;
  }
) => {
  const frequentItems = await fetchSpikeAnalysisFrequentItems(
    esClient,
    paramsWithIndex,
    fieldCandidates,
    windowParameters
  );

  // const ccsWarning =
  //   rejected.length > 0 && paramsWithIndex?.index.includes(':');

  return { frequentItems, ccsWarning: false };
};
