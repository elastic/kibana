/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRouteValidationFunction } from '@kbn/io-ts-utils';
import { InfraCustomDashboard } from '../../../common/custom_dashboards';
import {
  InfraSaveCustomDashboardsRequestPayloadRT,
  InfraSaveCustomDashboardsRequestPayload,
  InfraSaveCustomDashboardsResponseBodyRT,
  InfraGetCustomDashboardsRequestParamsRT,
} from '../../../common/http_api/custom_dashboards_api';
import { KibanaFramework } from '../../lib/adapters/framework/kibana_framework_adapter';
import { INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { checkCustomDashboardsEnabled } from './lib/check_custom_dashboards_enabled';
import { handleRouteErrors } from '../../utils/handle_route_errors';

export function initSaveCustomDashboardRoute(framework: KibanaFramework) {
  const validatePayload = createRouteValidationFunction(InfraSaveCustomDashboardsRequestPayloadRT);
  const validateParams = createRouteValidationFunction(InfraGetCustomDashboardsRequestParamsRT);

  framework.registerRoute(
    {
      method: 'post',
      path: '/api/infra/{assetType}/custom-dashboards',
      validate: {
        body: validatePayload,
        params: validateParams,
      },
      options: {
        access: 'internal',
      },
    },
    handleRouteErrors(async (context, request, response) => {
      const { savedObjectsClient, uiSettingsClient } = await context.infra;

      await checkCustomDashboardsEnabled(uiSettingsClient);

      const payload: InfraSaveCustomDashboardsRequestPayload = {
        ...request.body,
      };

      if (!payload?.id) {
        const savedCustomDashboard = await savedObjectsClient.create<InfraCustomDashboard>(
          INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE,
          {
            assetType: request.params.assetType,
            ...payload,
          }
        );

        return response.ok({
          body: InfraSaveCustomDashboardsResponseBodyRT.encode(savedCustomDashboard.attributes),
        });
      }

      const savedCustomDashboard = await savedObjectsClient.update<InfraCustomDashboard>(
        INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE,
        payload.id,
        {
          assetType: request.params.assetType,
          ...payload,
        }
      );

      return response.ok({
        body: InfraSaveCustomDashboardsResponseBodyRT.encode({
          assetType: request.params.assetType,
          ...payload,
          ...savedCustomDashboard.attributes,
        }),
      });
    })
  );
}
