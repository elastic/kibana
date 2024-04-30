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
  InfraSaveCustomDashboardsResponseBodyRT,
  InfraGetCustomDashboardsRequestPathParamsRT,
} from '../../../common/http_api/custom_dashboards_api';
import { KibanaFramework } from '../../lib/adapters/framework/kibana_framework_adapter';
import { INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { checkCustomDashboardsEnabled } from './lib/check_custom_dashboards_enabled';
import { handleRouteErrors } from '../../utils/handle_route_errors';
import { findCustomDashboard } from './lib/find_custom_dashboard';

export function initSaveCustomDashboardRoute(framework: KibanaFramework) {
  const validatePayload = createRouteValidationFunction(InfraSaveCustomDashboardsRequestPayloadRT);
  const validateParams = createRouteValidationFunction(InfraGetCustomDashboardsRequestPathParamsRT);

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

      const { dashboardSavedObjectId } = request.body;

      const { assetType } = request.params;

      const customDashboards = await findCustomDashboard(assetType, savedObjectsClient);

      const dashboardExist = customDashboards.find(
        (customDashboard) => customDashboard.dashboardSavedObjectId === dashboardSavedObjectId
      );

      if (dashboardExist) {
        return response.badRequest({
          body: `Dashboard with id ${dashboardSavedObjectId} has already been linked to ${assetType}`,
        });
      }

      const savedCustomDashboard = await savedObjectsClient.create<InfraCustomDashboard>(
        INFRA_CUSTOM_DASHBOARDS_SAVED_OBJECT_TYPE,
        {
          assetType,
          ...request.body,
        }
      );

      return response.ok({
        body: InfraSaveCustomDashboardsResponseBodyRT.encode({
          id: savedCustomDashboard.id,
          ...savedCustomDashboard.attributes,
        }),
      });
    })
  );
}
