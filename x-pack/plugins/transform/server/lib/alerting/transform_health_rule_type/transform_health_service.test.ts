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
import type {
  TransformGetTransformResponse,
  TransformGetTransformStatsResponse,
} from '@elastic/elasticsearch/lib/api/types';

describe('transformHealthServiceProvider', () => {
  let esClient: jest.Mocked<ElasticsearchClient>;
  let rulesClient: jest.Mocked<RulesClient>;
  let fieldFormatsRegistry: jest.Mocked<FieldFormatsRegistry>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    (esClient.transform.getTransform as jest.Mock).mockResolvedValue({
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
    } as unknown as TransformGetTransformResponse);
    (esClient.transform.getTransformStats as jest.Mock).mockResolvedValue({
      count: 2,
      transforms: [{}],
    } as unknown as TransformGetTransformStatsResponse);

    rulesClient = rulesClientMock.create();
    fieldFormatsRegistry = {
      deserialize: jest.fn(),
    } as unknown as jest.Mocked<FieldFormatsRegistry>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch transform stats by transform IDs if the length does not exceed the URL limit', async () => {
    const service = transformHealthServiceProvider({ esClient, rulesClient, fieldFormatsRegistry });
    const result = await service.getHealthChecksResults({
      includeTransforms: ['*'],
      excludeTransforms: ['transform4', 'transform6', 'transform62'],
      testsConfig: null,
    });

    expect(esClient.transform.getTransform).toHaveBeenCalledWith({
      allow_no_match: true,
      size: 1000,
    });
    expect(esClient.transform.getTransformStats).toHaveBeenCalledTimes(1);
    expect(esClient.transform.getTransformStats).toHaveBeenNthCalledWith(1, {
      basic: true,
      transform_id:
        'transform0,transform1,transform2,transform3,transform5,transform7,transform8,transform9,transform10,transform11,transform12,transform13,transform14,transform15,transform16,transform17,transform18,transform19,transform20,transform21,transform22,transform23,transform24,transform25,transform26,transform27,transform28,transform29,transform30,transform31,transform32,transform33,transform34,transform35,transform36,transform37,transform38,transform39,transform40,transform41,transform42,transform43,transform44,transform45,transform46,transform47,transform48,transform49,transform50,transform51,transform52,transform53,transform54,transform55,transform56,transform57,transform58,transform59,transform60,transform61,transform63,transform64,transform65,transform66,transform67,transform68,transform69,transform70,transform71,transform72,transform73,transform74,transform75,transform76,transform77,transform78,transform79,transform80,transform81,transform82,transform83,transform84,transform85,transform86,transform87,transform88,transform89,transform90,transform91,transform92,transform93,transform94,transform95,transform96,transform97,transform98,transform99,transform100,transform101',
    });

    expect(result).toBeDefined();
  });

  it('should fetch all transform stats and filter by transform IDs if the length exceeds the URL limit', async () => {
    const transformIdPrefix = 'transform_with_a_very_long_id_that_result_in_long_url_for_sure_';

    (esClient.transform.getTransform as jest.Mock).mockResolvedValue({
      count: 3,
      transforms: [
        // Mock continuous transforms
        ...new Array(102).fill(null).map((_, i) => ({
          id: `${transformIdPrefix}${i}`,
          sync: true,
        })),
        {
          id: 'transform102',
          sync: false,
        },
      ],
    } as unknown as TransformGetTransformResponse);

    (esClient.transform.getTransformStats as jest.Mock).mockResolvedValue({
      count: 2,
      transforms: [
        ...new Array(200).fill(null).map((_, i) => ({
          id: `${transformIdPrefix}${i}`,
          transform_state: 'stopped',
        })),
      ],
    } as unknown as TransformGetTransformStatsResponse);

    const service = transformHealthServiceProvider({ esClient, rulesClient, fieldFormatsRegistry });
    const result = await service.getHealthChecksResults({
      includeTransforms: ['*'],
      excludeTransforms: new Array(50).fill(null).map((_, i) => `${transformIdPrefix}${i + 60}`),
      testsConfig: null,
    });

    expect(esClient.transform.getTransform).toHaveBeenCalledWith({
      allow_no_match: true,
      size: 1000,
    });
    expect(esClient.transform.getTransformStats).toHaveBeenCalledTimes(1);
    expect(esClient.transform.getTransformStats).toHaveBeenNthCalledWith(1, {
      basic: true,
      transform_id: '_all',
    });

    const notStarted = result[0];

    expect(notStarted.context.message).toEqual(
      'Transform transform_with_a_very_long_id_that_result_in_long_url_for_sure_0, transform_with_a_very_long_id_that_result_in_long_url_for_sure_1, transform_with_a_very_long_id_that_result_in_long_url_for_sure_2, transform_with_a_very_long_id_that_result_in_long_url_for_sure_3, transform_with_a_very_long_id_that_result_in_long_url_for_sure_4, transform_with_a_very_long_id_that_result_in_long_url_for_sure_5, transform_with_a_very_long_id_that_result_in_long_url_for_sure_6, transform_with_a_very_long_id_that_result_in_long_url_for_sure_7, transform_with_a_very_long_id_that_result_in_long_url_for_sure_8, transform_with_a_very_long_id_that_result_in_long_url_for_sure_9, transform_with_a_very_long_id_that_result_in_long_url_for_sure_10, transform_with_a_very_long_id_that_result_in_long_url_for_sure_11, transform_with_a_very_long_id_that_result_in_long_url_for_sure_12, transform_with_a_very_long_id_that_result_in_long_url_for_sure_13, transform_with_a_very_long_id_that_result_in_long_url_for_sure_14, transform_with_a_very_long_id_that_result_in_long_url_for_sure_15, transform_with_a_very_long_id_that_result_in_long_url_for_sure_16, transform_with_a_very_long_id_that_result_in_long_url_for_sure_17, transform_with_a_very_long_id_that_result_in_long_url_for_sure_18, transform_with_a_very_long_id_that_result_in_long_url_for_sure_19, transform_with_a_very_long_id_that_result_in_long_url_for_sure_20, transform_with_a_very_long_id_that_result_in_long_url_for_sure_21, transform_with_a_very_long_id_that_result_in_long_url_for_sure_22, transform_with_a_very_long_id_that_result_in_long_url_for_sure_23, transform_with_a_very_long_id_that_result_in_long_url_for_sure_24, transform_with_a_very_long_id_that_result_in_long_url_for_sure_25, transform_with_a_very_long_id_that_result_in_long_url_for_sure_26, transform_with_a_very_long_id_that_result_in_long_url_for_sure_27, transform_with_a_very_long_id_that_result_in_long_url_for_sure_28, transform_with_a_very_long_id_that_result_in_long_url_for_sure_29, transform_with_a_very_long_id_that_result_in_long_url_for_sure_30, transform_with_a_very_long_id_that_result_in_long_url_for_sure_31, transform_with_a_very_long_id_that_result_in_long_url_for_sure_32, transform_with_a_very_long_id_that_result_in_long_url_for_sure_33, transform_with_a_very_long_id_that_result_in_long_url_for_sure_34, transform_with_a_very_long_id_that_result_in_long_url_for_sure_35, transform_with_a_very_long_id_that_result_in_long_url_for_sure_36, transform_with_a_very_long_id_that_result_in_long_url_for_sure_37, transform_with_a_very_long_id_that_result_in_long_url_for_sure_38, transform_with_a_very_long_id_that_result_in_long_url_for_sure_39, transform_with_a_very_long_id_that_result_in_long_url_for_sure_40, transform_with_a_very_long_id_that_result_in_long_url_for_sure_41, transform_with_a_very_long_id_that_result_in_long_url_for_sure_42, transform_with_a_very_long_id_that_result_in_long_url_for_sure_43, transform_with_a_very_long_id_that_result_in_long_url_for_sure_44, transform_with_a_very_long_id_that_result_in_long_url_for_sure_45, transform_with_a_very_long_id_that_result_in_long_url_for_sure_46, transform_with_a_very_long_id_that_result_in_long_url_for_sure_47, transform_with_a_very_long_id_that_result_in_long_url_for_sure_48, transform_with_a_very_long_id_that_result_in_long_url_for_sure_49, transform_with_a_very_long_id_that_result_in_long_url_for_sure_50, transform_with_a_very_long_id_that_result_in_long_url_for_sure_51, transform_with_a_very_long_id_that_result_in_long_url_for_sure_52, transform_with_a_very_long_id_that_result_in_long_url_for_sure_53, transform_with_a_very_long_id_that_result_in_long_url_for_sure_54, transform_with_a_very_long_id_that_result_in_long_url_for_sure_55, transform_with_a_very_long_id_that_result_in_long_url_for_sure_56, transform_with_a_very_long_id_that_result_in_long_url_for_sure_57, transform_with_a_very_long_id_that_result_in_long_url_for_sure_58, transform_with_a_very_long_id_that_result_in_long_url_for_sure_59 are not started.'
    );
  });
});
