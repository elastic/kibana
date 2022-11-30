/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { API_URLS } from '../../../common/constants';
import { ConfigKey } from '../../../common/runtime_types';
import { SyntheticsRestApiRouteFactory } from '../../legacy_uptime/routes/types';

export const getHasZipUrlMonitorRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: API_URLS.SYNTHETICS_HAS_ZIP_URL_MONITORS,
  validate: {},
  handler: async ({ savedObjectsClient, server }): Promise<any> => {
    const monitors = await server.fleet.packagePolicyService.list(savedObjectsClient, {
      kuery: 'ingest-package-policies.package.name:synthetics',
    });
    const hasZipUrlMonitors = monitors.items.some((item) => {
      const browserInput = item.inputs.find((input) => input.type === 'synthetics/browser');
      const streams = browserInput?.streams || [];
      return streams.find((stream) => stream.data_stream.dataset === 'browser')?.compiled_stream?.[
        ConfigKey.SOURCE_ZIP_URL
      ];
    });
    return {
      hasZipUrlMonitors,
      monitors: [],
    };
  },
});
