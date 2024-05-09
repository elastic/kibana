/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IBasePath } from '@kbn/core/server';
import { v4 as uuidv4 } from 'uuid';
import { SLODefinition } from '../../domain/models';
import {
  createTempSummaryDocument,
  EsSummaryDocument,
} from '../summary_transform_generator/helpers/create_temp_summary';

export const aSummaryDocument = (
  slo: SLODefinition,
  params: Partial<EsSummaryDocument> = {}
): EsSummaryDocument => {
  return {
    ...createTempSummaryDocument(slo, 'default', { publicBaseUrl: '' } as IBasePath),
    ...params,
  };
};

export const aHitFromSummaryIndex = (_source: any) => {
  return {
    _index: '.slo-observability.summary-v2',
    _id: uuidv4(),
    _score: 1,
    _source,
  };
};

export const aHitFromTempSummaryIndex = (_source: any) => {
  return {
    _index: '.slo-observability.summary-v2.temp',
    _id: uuidv4(),
    _score: 1,
    _source,
  };
};
