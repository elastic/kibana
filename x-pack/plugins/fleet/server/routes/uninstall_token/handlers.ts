/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import { appContextService } from '../../services';
import type { UninstallTokenServiceInterface } from '../../services/security/uninstall_token_service';
import type { FleetRequestHandler } from '../../types';
import type { GetUninstallTokensResponse } from '../../../common/types/rest_spec/uninstall_token';
import type { GetUninstallTokensRequestSchema } from '../../types/rest_spec/uninstall_token';

export const getUninstallTokensHandler: FleetRequestHandler<
  unknown,
  TypeOf<typeof GetUninstallTokensRequestSchema.query>
> = async (context, request, response) => {
  const { agentTamperProtectionEnabled } = appContextService.getExperimentalFeatures();
  if (!agentTamperProtectionEnabled) {
    return response.customError({
      statusCode: 404,
      body: { message: 'Not Found' },
    });
  }

  const uninstallTokenService = appContextService.getUninstallTokenService();
  if (!uninstallTokenService) {
    return response.customError({
      statusCode: 500,
      body: { message: 'Uninstall Token Service is unavailable.' },
    });
  }

  try {
    const uninstallTokens = await readUninstallTokens(
      uninstallTokenService,
      request.query.policyId
    );

    const { page = 1, perPage = 20 } = request.query;
    const items = paginateTokens(uninstallTokens, perPage, page);

    const body: GetUninstallTokensResponse = {
      items,
      total: Object.keys(uninstallTokens).length,
      perPage,
      page,
    };

    return response.ok({ body });
  } catch {
    return response.customError({
      statusCode: 500,
      body: { message: 'Failed to get uninstall tokens.' },
    });
  }
};

const readUninstallTokens = async (
  uninstallTokenService: UninstallTokenServiceInterface,
  policyIdFilter?: string
) => {
  let uninstallTokens: Record<string, string>;

  if (policyIdFilter) {
    const token = await uninstallTokenService.getTokenForPolicyId(policyIdFilter);

    uninstallTokens = token ? { [policyIdFilter]: token } : {};
  } else {
    uninstallTokens = await uninstallTokenService.getAllTokens();
  }

  return uninstallTokens;
};

const paginateTokens = (uninstallTokens: Record<string, string>, perPage: number, page: number) => {
  const policyIds = Object.keys(uninstallTokens);
  const items: Record<string, string> = {};

  for (let i = perPage * (page - 1); i < Math.min(perPage * page, policyIds.length); i++) {
    items[policyIds[i]] = uninstallTokens[policyIds[i]];
  }

  return items;
};
