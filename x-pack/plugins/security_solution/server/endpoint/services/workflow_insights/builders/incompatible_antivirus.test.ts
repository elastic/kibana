/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import type { KibanaRequest } from '@kbn/core/server';
import type { DefendInsightsPostRequestBody } from '@kbn/elastic-assistant-common';

import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';

import type { BuildWorkflowInsightParams } from '.';

import {
  Category,
  SourceType,
  TargetType,
  ActionType,
} from '../../../../../common/endpoint/types/workflow_insights';
import { createMockEndpointAppContext } from '../../../mocks';
import type { EndpointMetadataService } from '../../metadata';
import { groupEndpointIdsByOS } from '../helpers';
import { buildIncompatibleAntivirusWorkflowInsights } from './incompatible_antivirus';

jest.mock('../helpers', () => ({
  groupEndpointIdsByOS: jest.fn(),
}));

describe('buildIncompatibleAntivirusWorkflowInsights', () => {
  let params: BuildWorkflowInsightParams;

  beforeEach(() => {
    const mockEndpointAppContextService = createMockEndpointAppContext().service;
    mockEndpointAppContextService.getEndpointMetadataService = jest.fn().mockReturnValue({
      getMetadataForEndpoints: jest.fn(),
    });
    const endpointMetadataService =
      mockEndpointAppContextService.getEndpointMetadataService() as jest.Mocked<EndpointMetadataService>;

    params = {
      defendInsights: [
        {
          group: 'AVGAntivirus',
          events: [
            {
              id: 'lqw5opMB9Ke6SNgnxRSZ',
              endpointId: 'f6e2f338-6fb7-4c85-9c23-d20e9f96a051',
              value: '/Applications/AVGAntivirus.app/Contents/Backend/services/com.avg.activity',
            },
          ],
        },
      ],
      request: {
        body: {
          insightType: 'incompatible_antivirus',
          endpointIds: ['endpoint-1'],
          apiConfig: {
            connectorId: 'connector-id-1',
            actionTypeId: 'action-type-id-1',
            model: 'model-1',
          },
          anonymizationFields: [],
          subAction: 'invokeAI',
        },
      } as unknown as KibanaRequest<unknown, unknown, DefendInsightsPostRequestBody>,
      endpointMetadataService,
    };

    (groupEndpointIdsByOS as jest.Mock).mockResolvedValue({
      windows: ['endpoint-1'],
    });
  });

  it('should correctly build workflow insights', async () => {
    const result = await buildIncompatibleAntivirusWorkflowInsights(params);

    expect(result).toEqual([
      expect.objectContaining({
        '@timestamp': expect.any(moment),
        message: 'Incompatible antiviruses detected',
        category: Category.Endpoint,
        type: 'incompatible_antivirus',
        source: {
          type: SourceType.LlmConnector,
          id: 'connector-id-1',
          data_range_start: expect.any(moment),
          data_range_end: expect.any(moment),
        },
        target: {
          type: TargetType.Endpoint,
          ids: ['endpoint-1'],
        },
        action: {
          type: ActionType.Refreshed,
          timestamp: expect.any(moment),
        },
        value: 'AVGAntivirus',
        remediation: {
          exception_list_items: [
            {
              list_id: ENDPOINT_ARTIFACT_LISTS.trustedApps.id,
              name: 'AVGAntivirus',
              description: 'Suggested by Security Workflow Insights',
              entries: [
                {
                  field: 'process.executable.caseless',
                  operator: 'included',
                  type: 'match',
                  value:
                    '/Applications/AVGAntivirus.app/Contents/Backend/services/com.avg.activity',
                },
              ],
              tags: ['policy:all'],
              os_types: ['windows'],
            },
          ],
        },
        metadata: {
          notes: {
            llm_model: 'model-1',
          },
        },
      }),
    ]);
    expect(groupEndpointIdsByOS).toHaveBeenCalledWith(
      ['endpoint-1'],
      params.endpointMetadataService
    );
  });
});
