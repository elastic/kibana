/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import { appContextService } from '../../services';

import type { FleetRequestHandler } from '../../types';
import type { GetUninstallTokensRequestSchema } from '../../types/rest_spec/uninstall_token';

export const getUninstallTokensHandler: FleetRequestHandler<
  undefined,
  TypeOf<typeof GetUninstallTokensRequestSchema.query>
> = async (context, request, response) => {
  const uninstallTokenService = appContextService.getUninstallTokenService();

  const items = (await uninstallTokenService?.getAllTokens()) ?? {};

  return response.ok({
    body: {
      items,
      total: Object.keys(items ?? {}).length,
    },
  });
};
