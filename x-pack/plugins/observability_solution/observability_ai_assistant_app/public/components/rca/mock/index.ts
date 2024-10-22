/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AnalyzeEntityHealthToolMessage,
  RootCauseAnalysisForServiceEvent,
} from '@kbn/observability-utils-server/llm/service_rca';
import { MessageRole } from '@kbn/inference-plugin/common';
import { Required } from 'utility-types';
// @ts-ignore
import completeRootCauseAnalysisJson from './complete_root_cause_analysis.json';

export const completeRootCauseAnalysis =
  completeRootCauseAnalysisJson as RootCauseAnalysisForServiceEvent[];

export const controllerEntityHealthAnalysis = completeRootCauseAnalysis.find(
  (event) =>
    'role' in event &&
    event.role === MessageRole.Tool &&
    'analysis' in event.response &&
    event.response.analysis?.entity['service.name'] === 'cartservice'
) as Required<AnalyzeEntityHealthToolMessage, 'data'>;
