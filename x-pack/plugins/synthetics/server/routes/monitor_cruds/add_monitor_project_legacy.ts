/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { UMServerLibs } from '../../legacy_uptime/lib/lib';
import { ProjectMonitor } from '../../../common/runtime_types';

import { SyntheticsStreamingRouteFactory } from '../../legacy_uptime/routes/types';
import { API_URLS } from '../../../common/constants';

const MAX_PAYLOAD_SIZE = 1048576 * 20; // 20MiB

export const addSyntheticsProjectMonitorRouteLegacy: SyntheticsStreamingRouteFactory = (
  libs: UMServerLibs
) => ({
  method: 'PUT',
  path: API_URLS.SYNTHETICS_MONITORS_PROJECT_LEGACY,
  validate: {
    body: schema.object({
      project: schema.string(),
      keep_stale: schema.boolean(),
      monitors: schema.arrayOf(schema.any()),
    }),
  },
  options: {
    body: {
      maxBytes: MAX_PAYLOAD_SIZE,
    },
  },
  handler: async ({ server, subject, request }): Promise<any> => {
    const monitors = (request.body?.monitors as ProjectMonitor[]) || [];
    const failureMessage = i18n.translate('xpack.synthetics.server.projectMonitors.legacy.error', {
      defaultMessage: `Failed to create monitor`,
    });
    const deprecationNotice = i18n.translate(
      'xpack.synthetics.server.projectMonitors.legacy.deprecation',
      {
        defaultMessage: `This version of @elastic/synthetics is not supported in Kibana {version}. Please upgrade to ^1.0.0.`,
        values: {
          version: server.stackVersion,
        },
      }
    );

    subject?.next(deprecationNotice);
    subject?.next({
      failedMonitors: monitors.map((m) => ({
        id: m.id,
        reason: failureMessage,
        details: deprecationNotice,
      })),
      createdMonitors: [],
      updatedMonitors: [],
      staleMonitors: [],
      deletedMonitors: [],
      failedStaleMonitors: [],
    });
    subject?.complete();
  },
});
