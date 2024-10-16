/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { omit } from 'lodash';
import { PrivateLocationAttributes } from '../../runtime_types/private_locations';
import { getPrivateLocationsForMonitor } from '../monitor_cruds/add_monitor/utils';
import { SyntheticsRestApiRouteFactory } from '../types';
import { ConfigKey, MonitorFields } from '../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { validateMonitor } from '../monitor_cruds/monitor_validation';
import { mapInlineToProjectFields } from '../../synthetics_service/utils/map_inline_to_project_fields';

export const runOnceSyntheticsMonitorRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.RUN_ONCE_MONITOR + '/{monitorId}',
  validate: {
    body: schema.any(),
    params: schema.object({
      monitorId: schema.string({ minLength: 1, maxLength: 1024 }),
    }),
  },
  handler: async ({
    request,
    response,
    server,
    syntheticsMonitorClient,
    savedObjectsClient,
  }): Promise<any> => {
    const requestFields = request.body as MonitorFields;
    const { monitorId } = request.params;

    const validationResult = validateMonitor(requestFields);

    const spaceId = server.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;

    const decodedMonitor = validationResult.decodedMonitor;
    if (!validationResult.valid || !decodedMonitor) {
      const { reason: message, details, payload } = validationResult;
      return response.badRequest({ body: { message, attributes: { details, ...payload } } });
    }

    const privateLocations: PrivateLocationAttributes[] = await getPrivateLocationsForMonitor(
      savedObjectsClient,
      decodedMonitor
    );

    const monitorFields = {
      ...decodedMonitor,
      [ConfigKey.CONFIG_ID]: monitorId,
      [ConfigKey.MONITOR_QUERY_ID]: monitorId,
    } as MonitorFields;
    const zippedProjectFields = await mapInlineToProjectFields({
      monitorType: decodedMonitor.type,
      monitor: monitorFields,
      logger: server.logger,
    });
    const monitor = omit(
      Object.assign(monitorFields, zippedProjectFields),
      ConfigKey.SOURCE_INLINE
    ) as MonitorFields;
    const [, errors] = await syntheticsMonitorClient.testNowConfigs(
      {
        monitor,
        id: monitorId,
        testRunId: monitorId,
      },
      privateLocations,
      spaceId,
      true
    );

    if (errors) {
      return { errors };
    }

    return requestFields;
  },
});
