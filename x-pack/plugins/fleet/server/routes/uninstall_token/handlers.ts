/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import type { CustomHttpResponseOptions, ResponseError } from '@kbn/core-http-server';

import { appContextService } from '../../services';
import type { FleetRequestHandler } from '../../types';
import type { GetUninstallTokensResponse } from '../../../common/types/rest_spec/uninstall_token';
import type {
  GetUninstallTokensForOnePolicyRequestSchema,
  GetUninstallTokensRequestSchema,
} from '../../types/rest_spec/uninstall_token';
import { defaultFleetErrorHandler } from '../../errors';

const UNINSTALL_TOKEN_SERVICE_UNAVAILABLE_ERROR: CustomHttpResponseOptions<ResponseError> = {
  statusCode: 500,
  body: { message: 'Uninstall Token Service is unavailable.' },
};

export const getUninstallTokensHandler: FleetRequestHandler<
  unknown,
  TypeOf<typeof GetUninstallTokensRequestSchema.query>
> = async (context, request, response) => {
  const uninstallTokenService = appContextService.getUninstallTokenService();
  if (!uninstallTokenService) {
    return response.customError(UNINSTALL_TOKEN_SERVICE_UNAVAILABLE_ERROR);
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
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const getUninstallTokensForOnePolicyHandler: FleetRequestHandler<
  TypeOf<typeof GetUninstallTokensForOnePolicyRequestSchema.params>
> = async (context, request, response) => {
  const uninstallTokenService = appContextService.getUninstallTokenService();
  if (!uninstallTokenService) {
    return response.customError(UNINSTALL_TOKEN_SERVICE_UNAVAILABLE_ERROR);
  }

  try {
    const { agentPolicyId } = request.params;

    const tokensForOnePolicy = await uninstallTokenService.getTokensForPolicyId(agentPolicyId);

    if (tokensForOnePolicy.total === 0) {
      return response.notFound({
        body: { message: `Uninstall Token not found for Agent Policy ${agentPolicyId}` },
      });
    }

    return response.ok({ body: tokensForOnePolicy });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};
