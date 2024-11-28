/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import type { DefendInsightsResponse } from '@kbn/elastic-assistant-common';
import {
  DEFEND_INSIGHTS,
  DefendInsightTypeEnum,
  ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
} from '@kbn/elastic-assistant-common';
import { useKibana } from '../../../../../../common/lib/kibana';

interface UseTriggerScanPayload {
  endpointId: string;
  connectorId: string;
  actionTypeId: string;
}

export const useTriggerScan = (
  onTriggerScanComplete: () => void,
  disableScanButton: () => void
) => {
  const { http } = useKibana().services;
  return useMutation<DefendInsightsResponse, unknown, UseTriggerScanPayload>(
    ({ endpointId, connectorId, actionTypeId }: UseTriggerScanPayload) =>
      http.post<DefendInsightsResponse>(DEFEND_INSIGHTS, {
        version: ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
        body: JSON.stringify({
          endpointIds: [endpointId],
          insightType: DefendInsightTypeEnum.incompatible_antivirus,
          anonymizationFields: [],
          subAction: 'invokeAI',
          apiConfig: {
            connectorId,
            actionTypeId,
          },
        }),
      }),
    {
      onMutate: () => {
        disableScanButton();
      },
      onSuccess: () => {
        onTriggerScanComplete();
      },
    }
  );
};
