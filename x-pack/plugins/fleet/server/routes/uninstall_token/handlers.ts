/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { CustomHttpResponseOptions, ResponseError } from '@kbn/core-http-server';

import { appContextService, agentPolicyService } from '../../services';
import type { FleetRequestHandler } from '../../types';
import type {
  GetUninstallTokensMetadataRequestSchema,
  GetUninstallTokenRequestSchema,
} from '../../types/rest_spec/uninstall_token';
import { defaultFleetErrorHandler } from '../../errors';
import type { GetUninstallTokenResponse } from '../../../common/types/rest_spec/uninstall_token';
import { AGENT_POLICY_SAVED_OBJECT_TYPE, SO_SEARCH_LIMIT } from '../../constants';

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

  const { page = 1, perPage = 20, policyId, search } = request.query;

  if (policyId && search) {
    return response.badRequest({
      body: {
        message: 'Query parameters `policyId` and `search` cannot be used at the same time.',
      },
    });
  }

  try {
    const fleetContext = await context.fleet;
    const soClient = fleetContext.internalSoClient;

    const { items: managedPolicies } = await agentPolicyService.list(soClient, {
      fields: ['id'],
      perPage: SO_SEARCH_LIMIT,
      kuery: `${AGENT_POLICY_SAVED_OBJECT_TYPE}.is_managed:true`,
    });

    const managedPolicyIds = managedPolicies.map((policy) => policy.id);

    let policyIdSearchTerm: string | undefined;
    let policyNameSearchTerm: string | undefined;
    if (search) {
      policyIdSearchTerm = search.trim();
      policyNameSearchTerm = search.trim();
    } else if (policyId) {
      policyIdSearchTerm = policyId.trim();
    }

    const body = await uninstallTokenService.getTokenMetadata(
      policyIdSearchTerm,
      policyNameSearchTerm,
      page,
      perPage,
      managedPolicyIds.length > 0 ? managedPolicyIds : undefined
    );

    return response.ok({ body });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};

export const getUninstallTokenHandler: FleetRequestHandler<
  TypeOf<typeof GetUninstallTokenRequestSchema.params>
> = async (context, request, response) => {
  const uninstallTokenService = appContextService.getUninstallTokenService();
  if (!uninstallTokenService) {
    return response.customError(UNINSTALL_TOKEN_SERVICE_UNAVAILABLE_ERROR);
  }

  try {
    const { uninstallTokenId } = request.params;

    const token = await uninstallTokenService.getToken(uninstallTokenId);

    if (token === null) {
      return response.notFound({
        body: { message: `Uninstall Token not found with id ${uninstallTokenId}` },
      });
    }

    const body: GetUninstallTokenResponse = {
      item: token,
    };

    return response.ok({ body });
  } catch (error) {
    return defaultFleetErrorHandler({ error, response });
  }
};
