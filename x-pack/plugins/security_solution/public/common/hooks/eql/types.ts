/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Unit } from '@kbn/datemath';

import type { InspectResponse } from '../../../types';
import type { ChartData } from '../../components/charts/common';
import type { inputsModel } from '../../store';

export interface EqlPreviewRequest {
  to: string;
  from: string;
  interval: Unit;
  query: string;
  index: string[];
}

export interface EqlPreviewResponse {
  data: ChartData[];
  totalCount: number;
  inspect: InspectResponse;
  refetch: inputsModel.Refetch;
}

export interface Source {
  '@timestamp': string | number;
}
