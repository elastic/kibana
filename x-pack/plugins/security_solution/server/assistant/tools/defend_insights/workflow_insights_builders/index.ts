/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

import type { DefendInsight, DefendInsightsPostRequestBody } from '@kbn/elastic-assistant-common';
import { DefendInsightType } from '@kbn/elastic-assistant-common';
import type { SecurityWorkflowInsight } from '../../../../../common/endpoint/types/workflow_insights';

import { InvalidDefendInsightTypeError } from '../errors';
import { buildIncompatibleAntivirusWorkflowInsights } from './incompatible_antivirus';

export interface BuildWorkflowInsightParams {
  defendInsights: DefendInsight[];
  request: KibanaRequest<unknown, unknown, DefendInsightsPostRequestBody>;
}

export function buildWorkflowInsights(
  params: BuildWorkflowInsightParams
): SecurityWorkflowInsight[] {
  if (params.request.body.insightType === DefendInsightType.Enum.incompatible_antivirus) {
    return buildIncompatibleAntivirusWorkflowInsights(params);
  }

  throw new InvalidDefendInsightTypeError();
}
