/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Unit } from '@elastic/datemath';

import { InspectResponse } from '../../../types';
import { ChartData } from '../../components/charts/common';
import { inputsModel } from '../../../common/store';

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
  '@timestamp': string;
}
