/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { resultsServiceRxProvider } from './result_service_rx';
import { resultsServiceProvider } from './results_service';
import type { MlApiServices } from '../ml_api_service';
import { ml } from '../ml_api_service';
import { useMlKibana } from '../../contexts/kibana';

export type MlResultsService = typeof mlResultsService;

type Time = string;
export interface ModelPlotOutputResults {
  results: Record<Time, { actual: number; modelUpper: number | null; modelLower: number | null }>;
}

export interface CriteriaField {
  fieldName: string;
  fieldValue: any;
}

export const mlResultsService = mlResultsServiceProvider(ml);

export function mlResultsServiceProvider(mlApiServices: MlApiServices) {
  return {
    ...resultsServiceProvider(mlApiServices),
    ...resultsServiceRxProvider(mlApiServices),
  };
}

export function useMlResultsService(): MlResultsService {
  const {
    services: {
      mlServices: { mlApiServices },
    },
  } = useMlKibana();

  const resultsService = useMemo(() => mlResultsServiceProvider(mlApiServices), [mlApiServices]);
  return resultsService;
}
