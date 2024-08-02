/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resultsServiceRxProvider } from './result_service_rx';
import { resultsServiceProvider } from './results_service';
import type { MlApiServices } from '../ml_api_service';
import { useMlApiContext } from '../../contexts/kibana';

export type MlResultsService = ReturnType<typeof resultsServiceProvider> &
  ReturnType<typeof resultsServiceRxProvider>;

type Time = string;
export interface ModelPlotOutputResults {
  results: Record<Time, { actual: number; modelUpper: number | null; modelLower: number | null }>;
}

export interface CriteriaField {
  fieldName: string;
  fieldValue: any;
}

// This is to retain the singleton behavior of the previous direct instantiation and export.
let mlResultsService: MlResultsService;
export function mlResultsServiceProvider(mlApiServices: MlApiServices) {
  if (mlResultsService) return mlResultsService;

  mlResultsService = {
    ...resultsServiceProvider(mlApiServices),
    ...resultsServiceRxProvider(mlApiServices),
  };

  return mlResultsService;
}

export function useMlResultsService(): MlResultsService {
  const mlApiServices = useMlApiContext();
  return mlResultsServiceProvider(mlApiServices);
}
