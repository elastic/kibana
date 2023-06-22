/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import { appContextService } from '../../services';
import type { FleetRequestHandler } from '../../types';
import type { GetUninstallTokensMetadataRequestSchema } from '../../types/rest_spec/uninstall_token';
import { defaultFleetErrorHandler } from '../../errors';

export const getUninstallTokensMetadataHandler: FleetRequestHandler<
  unknown,
  TypeOf<typeof GetUninstallTokensMetadataRequestSchema.query>
> = async (context, request, response) => {
  const uninstallTokenService = appContextService.getUninstallTokenService();
  if (!uninstallTokenService) {
    return response.customError({
      statusCode: 500,
      body: { message: 'Uninstall Token Service is unavailable.' },
    });
  }

  try {
    const { page = 1, perPage = 20, policyId } = request.query;

    const body = await uninstallTokenService.getTokenMetadata(policyId?.trim(), page, perPage);

    return response.ok({ body });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};
