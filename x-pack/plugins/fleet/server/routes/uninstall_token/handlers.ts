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
import type {
  GetUninstallTokensMetadataRequestSchema,
  GetUninstallTokenRequestSchema,
} from '../../types/rest_spec/uninstall_token';
import { defaultFleetErrorHandler } from '../../errors';
import type { GetUninstallTokenResponse } from '../../../common/types/rest_spec/uninstall_token';

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

    const body = await uninstallTokenService.getTokenMetadata(policyId?.trim(), page, perPage);

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
