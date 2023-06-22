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
import type { GetUninstallTokensMetadataResponse } from '../../../common/types/rest_spec/uninstall_token';
import type {
  GetUninstallTokensByPolicyIdRequestSchema,
  GetUninstallTokensMetadataRequestSchema,
} from '../../types/rest_spec/uninstall_token';
import { defaultFleetErrorHandler } from '../../errors';

const UNINSTALL_TOKEN_SERVICE_UNAVAILABLE_ERROR: CustomHttpResponseOptions<ResponseError> = {
  statusCode: 500,
  body: { message: 'Uninstall Token Service is unavailable.' },
};

export const getUninstallTokensMetadataHandler: FleetRequestHandler<
  unknown,
  TypeOf<typeof GetUninstallTokensMetadataRequestSchema.query>
> = async (context, request, response) => {
  const uninstallTokenService = appContextService.getUninstallTokenService();
  if (!uninstallTokenService) {
    return response.customError(UNINSTALL_TOKEN_SERVICE_UNAVAILABLE_ERROR);
  }

  try {
    const { page = 1, perPage = 20, policyId } = request.query;

    let body: GetUninstallTokensMetadataResponse;
    if (policyId) {
      body = await uninstallTokenService.searchTokenMetadata(policyId, page, perPage);
    } else {
      body = await uninstallTokenService.getTokenMetadataForAllPolicies(page, perPage);
    }

    return response.ok({ body });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const getUninstallTokensByPolicyIdHandler: FleetRequestHandler<
  TypeOf<typeof GetUninstallTokensByPolicyIdRequestSchema.params>
> = async (context, request, response) => {
  const uninstallTokenService = appContextService.getUninstallTokenService();
  if (!uninstallTokenService) {
    return response.customError(UNINSTALL_TOKEN_SERVICE_UNAVAILABLE_ERROR);
  }

  try {
    const { agentPolicyId } = request.params;

    const tokensForOnePolicy = await uninstallTokenService.getTokenHistoryForPolicy(agentPolicyId);

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
