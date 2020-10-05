/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { InspectResponse } from '../../../types';
import { ChartData } from '../../components/charts/common';

export interface EqlPreviewResponse {
  data: ChartData[];
  totalCount: number;
  lte: string;
  gte: string;
  inspect: InspectResponse;
  warnings: string[];
}

export interface Source {
  '@timestamp': string;
}
