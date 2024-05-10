/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformHealthServiceProvider } from './transform_health_service';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { FieldFormatsRegistry } from '@kbn/field-formats-plugin/common';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { rulesClientMock } from '@kbn/alerting-plugin/server/rules_client.mock';
import type { TransformGetTransformResponse } from '@elastic/elasticsearch/lib/api/types';

describe('transformHealthServiceProvider', () => {
  let esClient: ElasticsearchClient;
  let rulesClient: RulesClient;
  let fieldFormatsRegistry: FieldFormatsRegistry;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    esClient.transform.getTransform.mockResolvedValue({
      count: 3,
      transforms: [
        // Mock continuous transforms
        ...new Array(102).fill(null).map((_, i) => ({
          id: `transform${i}`,
          sync: true,
        })),
        {
          id: 'transform102',
          sync: false,
        },
      ],
    } as TransformGetTransformResponse);
    esClient.transform.getTransformStats.mockResolvedValue({
      count: 2,
      transforms: [{}],
    } as TransformGetTransformStatsResponse);

    rulesClient = rulesClientMock.create();
    fieldFormatsRegistry = {
      deserialize: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should run health checks by default', async () => {
    const service = transformHealthServiceProvider({ esClient, rulesClient, fieldFormatsRegistry });
    const result = await service.getHealthChecksResults({
      includeTransforms: ['*'],
      excludeTransforms: ['transform4', 'transform6', 'transform62'],
    });

    expect(esClient.transform.getTransform).toHaveBeenCalledWith({
      allow_no_match: true,
      size: 1000,
    });
    // Check that memoization and chinking applied correctly
    expect(esClient.transform.getTransformStats).toHaveBeenCalledTimes(4);
    expect(esClient.transform.getTransformStats).toHaveBeenNthCalledWith(1, {
      transform_id:
        'transform0,transform1,transform2,transform3,transform5,transform7,transform8,transform9,transform10,transform11,transform12,transform13,transform14,transform15,transform16,transform17,transform18,transform19,transform20,transform21,transform22,transform23,transform24,transform25,transform26,transform27,transform28,transform29,transform30,transform31',
    });
    expect(esClient.transform.getTransformStats).toHaveBeenNthCalledWith(2, {
      transform_id:
        'transform32,transform33,transform34,transform35,transform36,transform37,transform38,transform39,transform40,transform41,transform42,transform43,transform44,transform45,transform46,transform47,transform48,transform49,transform50,transform51,transform52,transform53,transform54,transform55,transform56,transform57,transform58,transform59,transform60,transform61',
    });
    expect(esClient.transform.getTransformStats).toHaveBeenNthCalledWith(3, {
      transform_id:
        'transform63,transform64,transform65,transform66,transform67,transform68,transform69,transform70,transform71,transform72,transform73,transform74,transform75,transform76,transform77,transform78,transform79,transform80,transform81,transform82,transform83,transform84,transform85,transform86,transform87,transform88,transform89,transform90,transform91,transform92',
    });
    expect(esClient.transform.getTransformStats).toHaveBeenNthCalledWith(4, {
      transform_id:
        'transform93,transform94,transform95,transform96,transform97,transform98,transform99,transform100,transform101',
    });

    expect(result).toBeDefined();
  });
});
