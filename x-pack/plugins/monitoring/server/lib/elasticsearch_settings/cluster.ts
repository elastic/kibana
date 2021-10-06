/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { ClusterGetSettingsResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { findReason } from './find_reason';
import { ClusterSettingsReasonResponse, LegacyRequest } from '../../types';

export function handleResponse(
  response: ClusterGetSettingsResponse,
  isCloudEnabled: boolean
): ClusterSettingsReasonResponse {
  let source: keyof ClusterGetSettingsResponse;
  for (source in response) {
    if (Object.prototype.hasOwnProperty.call(response, source)) {
      const monitoringSettings = get(response[source], 'xpack.monitoring');
      if (monitoringSettings !== undefined) {
        const check = findReason(
          monitoringSettings,
          {
            context: `cluster ${source}`,
          },
          isCloudEnabled
        );

        if (check.found) {
          return check;
        }
      }
    }
  }

  return { found: false };
}

export async function checkClusterSettings(req: LegacyRequest) {
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('admin');
  const { cloud } = req.server.newPlatform.setup.plugins;
  const isCloudEnabled = !!(cloud && cloud.isCloudEnabled);
  const response = await callWithRequest(req, 'cluster.getSettings', { include_defaults: true });
  return handleResponse(response, isCloudEnabled);
}
