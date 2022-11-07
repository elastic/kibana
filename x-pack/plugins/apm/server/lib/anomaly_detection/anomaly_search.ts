/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESSearchRequest, ESSearchResponse } from '@kbn/es-types';
import { MlClient } from '../helpers/get_ml_client';

interface SharedFields {
  job_id: string;
  bucket_span: number;
  detector_index: number;
  timestamp: number;
  partition_field_name: string;
  partition_field_value: string;
  by_field_name: string;
  by_field_value: string;
}

interface MlModelPlot extends SharedFields {
  result_type: 'model_plot';
  model_feature: string;
  model_lower: number;
  model_upper: number;
  model_median: number;
  actual: number;
}

interface MlRecord extends SharedFields {
  result_type: 'record';
  record_score: number;
  initial_record_score: number;
  function: string;
  function_description: string;
  typical: number[];
  actual: number[];
  field_name: string;
  is_interim: boolean;
}

type AnomalyDocument = MlRecord | MlModelPlot;

export async function anomalySearch<TParams extends ESSearchRequest>(
  mlAnomalySearch: Required<MlClient>['mlSystem']['mlAnomalySearch'],
  params: TParams
): Promise<ESSearchResponse<AnomalyDocument, TParams>> {
  const response = await mlAnomalySearch(params, []);

  return response as unknown as ESSearchResponse<AnomalyDocument, TParams>;
}
