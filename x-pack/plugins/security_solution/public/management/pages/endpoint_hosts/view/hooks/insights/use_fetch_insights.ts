/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION } from '@kbn/elastic-assistant-common';
import type { SecurityWorkflowInsight } from '../../../../../../../common/endpoint/types/workflow_insights';
import { ActionType } from '../../../../../../../common/endpoint/types/workflow_insights';
import { WORKFLOW_INSIGHTS_ROUTE } from '../../../../../../../common/endpoint/constants';
import { useKibana } from '../../../../../../common/lib/kibana';

interface UseFetchInsightsConfig {
  endpointId: string;
  onSuccess: () => void;
}

export const useFetchInsights = ({ endpointId, onSuccess }: UseFetchInsightsConfig) => {
  const { http } = useKibana().services;

  return useQuery<SecurityWorkflowInsight[], unknown, SecurityWorkflowInsight[]>(
    [`fetchInsights-${endpointId}`],
    async () => {
      const result = await http.get<SecurityWorkflowInsight[]>(WORKFLOW_INSIGHTS_ROUTE, {
        version: ELASTIC_AI_ASSISTANT_INTERNAL_API_VERSION,
        query: {
          actionTypes: JSON.stringify([ActionType.Refreshed]),
          targetIds: JSON.stringify([endpointId]),
        },
      });
      onSuccess();
      return result;
    },
    {
      refetchOnWindowFocus: false,
    }
  );
};
