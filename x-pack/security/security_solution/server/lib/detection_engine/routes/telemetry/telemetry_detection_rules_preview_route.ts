/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import { SECURITY_TELEMETRY_URL } from '../../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import type { ITelemetryReceiver } from '../../../telemetry/receiver';
import type { ITelemetryEventsSender } from '../../../telemetry/sender';
import { getDetectionRulesPreview } from './utils/get_detecton_rules_preview';
import { getSecurityListsPreview } from './utils/get_security_lists_preview';
import { getEndpointPreview } from './utils/get_endpoint_preview';
import { getDiagnosticsPreview } from './utils/get_diagnostics_preview';

export const telemetryDetectionRulesPreviewRoute = (
  router: SecuritySolutionPluginRouter,
  logger: Logger,
  telemetryReceiver: ITelemetryReceiver,
  telemetrySender: ITelemetryEventsSender
) => {
  router.versioned
    .get({
      path: SECURITY_TELEMETRY_URL,
      access: 'internal',
      options: {
        tags: ['access:securitySolution'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: false,
      },
      async (context, request, response) => {
        const detectionRules = await getDetectionRulesPreview({
          logger,
          telemetryReceiver,
          telemetrySender,
        });

        const securityLists = await getSecurityListsPreview({
          logger,
          telemetryReceiver,
          telemetrySender,
        });

        const endpoints = await getEndpointPreview({
          logger,
          telemetryReceiver,
          telemetrySender,
        });

        const diagnostics = await getDiagnosticsPreview({
          logger,
          telemetryReceiver,
          telemetrySender,
        });

        return response.ok({
          body: {
            detection_rules: detectionRules,
            security_lists: securityLists,
            endpoints,
            diagnostics,
          },
        });
      }
    );
};
