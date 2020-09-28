/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SnapshotRequest } from '../../../../common/http_api';
import { ESSearchClient } from '../../../lib/metrics/types';
import { InfraSource } from '../../../lib/sources';
import { transformRequestToMetricsAPIRequest } from './transform_request_to_metrics_api_request';
import { queryAllData } from './query_all_data';
import { transformMetricsApiResponseToSnapshotResponse } from './trasform_metrics_ui_response';
import { copyMissingMetrics } from './copy_missing_metrics';

export const getNodes = async (
  client: ESSearchClient,
  snapshotRequest: SnapshotRequest,
  source: InfraSource
) => {
  const metricsApiRequest = await transformRequestToMetricsAPIRequest(
    client,
    source,
    snapshotRequest
  );
  const metricsApiResponse = await queryAllData(client, metricsApiRequest);
  return copyMissingMetrics(
    transformMetricsApiResponseToSnapshotResponse(
      metricsApiRequest,
      snapshotRequest,
      source,
      metricsApiResponse
    )
  );
};
