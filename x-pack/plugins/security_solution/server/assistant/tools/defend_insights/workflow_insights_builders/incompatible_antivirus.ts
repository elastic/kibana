/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';

import type { DefendInsight } from '@kbn/elastic-assistant-common';
import type { BuildWorkflowInsightParams } from '.';
import type { SecurityWorkflowInsight } from '../../../../../common/endpoint/types/workflow_insights';

import {
  ActionType,
  Category,
  SourceType,
  TargetType,
} from '../../../../../common/endpoint/types/workflow_insights';
import { SUPPORTED_HOST_OS_TYPE } from '../../../../../common/endpoint/constants';

export function buildIncompatibleAntivirusWorkflowInsights(
  params: BuildWorkflowInsightParams
): SecurityWorkflowInsight[] {
  const currentTime = moment();
  const { defendInsights, request } = params;
  const { insightType, endpointIds, apiConfig } = request.body;
  return defendInsights.map((defendInsight: DefendInsight) => {
    const filePaths = (defendInsight.events ?? []).map((event) => event.value);
    return {
      '@timestamp': currentTime,
      // TODO add i18n support
      message: 'Incompatible antiviruses detected',
      category: Category.Endpoint,
      type: insightType,
      source: {
        type: SourceType.LlmConnector,
        id: apiConfig.connectorId,
        // TODO use actual time range when we add support
        data_range_start: currentTime,
        data_range_end: currentTime.clone().add(24, 'hours'),
      },
      target: {
        type: TargetType.Endpoint,
        ids: endpointIds,
      },
      action: {
        type: ActionType.Refreshed,
        timestamp: currentTime,
      },
      value: defendInsight.group,
      remediation: {
        exception_list_items: [
          {
            list_id: ENDPOINT_ARTIFACT_LISTS.blocklists.id,
            name: defendInsight.group,
            description: 'Suggested by Security Workflow Insights',
            entries: [
              {
                field: 'file.path.caseless',
                operator: 'included',
                type: 'match_any',
                value: filePaths,
              },
            ],
            // TODO add per policy support
            tags: ['policy:all'],
            os_types: [
              // TODO pick this based on endpointIds
              SUPPORTED_HOST_OS_TYPE[0],
              SUPPORTED_HOST_OS_TYPE[1],
              SUPPORTED_HOST_OS_TYPE[2],
            ],
          },
        ],
      },
      metadata: {
        notes: {
          llm_model: apiConfig.model ?? '',
        },
      },
    };
  });
}
