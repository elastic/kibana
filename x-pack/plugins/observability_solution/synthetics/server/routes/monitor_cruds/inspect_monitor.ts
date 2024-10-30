/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { v4 as uuidV4 } from 'uuid';
import { schema } from '@kbn/config-schema';
import { PrivateLocationAttributes } from '../../runtime_types/private_locations';
import { SyntheticsRestApiRouteFactory } from '../types';
import { unzipFile } from '../../common/unzip_project_code';
import { ConfigKey, MonitorFields, SyntheticsMonitor } from '../../../common/runtime_types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { DEFAULT_FIELDS } from '../../../common/constants/monitor_defaults';
import { validateMonitor } from './monitor_validation';
import { getPrivateLocationsForMonitor } from './add_monitor/utils';
import { AddEditMonitorAPI } from './add_monitor/add_monitor_api';

export const inspectSyntheticsMonitorRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.SYNTHETICS_MONITOR_INSPECT,
  validate: {
    body: schema.any(),
    query: schema.object({
      id: schema.maybe(schema.string()),
      hideParams: schema.maybe(schema.boolean()),
    }),
  },
  handler: async (routeContext): Promise<any> => {
    const { savedObjectsClient, server, syntheticsMonitorClient, request, spaceId, response } =
      routeContext;
    // usually id is auto generated, but this is useful for testing
    const { id, hideParams = true } = request.query;

    const monitor: SyntheticsMonitor = request.body as SyntheticsMonitor;
    const monitorType = monitor[ConfigKey.MONITOR_TYPE];
    const monitorWithDefaults = {
      ...DEFAULT_FIELDS[monitorType],
      ...monitor,
    };

    const validationResult = validateMonitor(monitorWithDefaults as MonitorFields);

    if (!validationResult.valid || !validationResult.decodedMonitor) {
      const { reason: message, details, payload } = validationResult;
      return response.badRequest({ body: { message, attributes: { details, ...payload } } });
    }

    const normalizedMonitor = validationResult.decodedMonitor;

    const privateLocations: PrivateLocationAttributes[] = await getPrivateLocationsForMonitor(
      savedObjectsClient,
      normalizedMonitor
    );

    const canSave =
      Boolean(
        (
          await server.coreStart?.capabilities.resolveCapabilities(request, {
            capabilityPath: 'uptime.*',
          })
        ).uptime.save
      ) ?? false;

    try {
      const newMonitorId = id ?? uuidV4();

      const addMonitorAPI = new AddEditMonitorAPI(routeContext);

      const monitorWithNamespace = addMonitorAPI.hydrateMonitorFields({
        normalizedMonitor,
        newMonitorId,
      });

      const result = await syntheticsMonitorClient.inspectMonitor(
        { monitor: monitorWithNamespace as MonitorFields, id: newMonitorId },
        privateLocations,
        spaceId,
        hideParams,
        canSave
      );

      const publicConfigs = result.publicConfigs;

      const sampleMonitor = publicConfigs?.[0]?.monitors?.[0];

      const hasSourceContent = sampleMonitor?.streams[0][ConfigKey.SOURCE_PROJECT_CONTENT];
      let decodedCode = '';
      if (hasSourceContent) {
        decodedCode = await unzipFile(hasSourceContent);
      }

      return response.ok({ body: { result, decodedCode: formatCode(decodedCode) } });
    } catch (getErr) {
      server.logger.error(
        `Unable to inspect Synthetics monitor ${monitorWithDefaults[ConfigKey.NAME]}`
      );
      server.logger.error(getErr);

      return response.customError({
        body: { message: getErr.message },
        statusCode: 500,
      });
    }
  },
});

const formatCode = (code: string) => {
  const replacements = [
    { pattern: /\(\d*,\s*import_synthetics\d*\.step\)/g, replacement: 'step' },
    { pattern: /\(\d*,\s*import_synthetics\d*\.journey\)/g, replacement: 'journey' },
    { pattern: /import_synthetics\d*\.monitor/g, replacement: 'monitor' },
    { pattern: /\(\d*,\s*import_synthetics\d*\.expect\)/g, replacement: 'expect' },
  ];

  let updated = code;
  replacements.forEach(({ pattern, replacement }) => {
    updated = updated.replace(pattern, replacement);
  });

  return updated
    .replace(
      /var import_synthetics\d* = require\("@elastic\/synthetics"\);/,
      "import { step, journey, monitor, expect } from '@elastic/synthetics';"
    )
    .replace(
      /var import_synthetics = require\("@elastic\/synthetics"\);/,
      "import { step, journey, monitor, expect } from '@elastic/synthetics';"
    );
};
