/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import { appContextService } from '../../services';
import type { FleetRequestHandler } from '../../types';
import type { GetUninstallTokensResponse } from '../../../common/types/rest_spec/uninstall_token';
import type { GetUninstallTokensRequestSchema } from '../../types/rest_spec/uninstall_token';

export const getUninstallTokensHandler: FleetRequestHandler<
  unknown,
  TypeOf<typeof GetUninstallTokensRequestSchema.query>
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

    let body: GetUninstallTokensResponse;
    if (policyId) {
      body = await uninstallTokenService.findTokensForPartialPolicyId(policyId, page, perPage);
    } else {
      body = await uninstallTokenService.getAllTokens(page, perPage);
    }

    return response.ok({ body });
  } catch {
    return response.customError({
      statusCode: 500,
      body: { message: 'Failed to get uninstall tokens.' },
    });
  }
};
