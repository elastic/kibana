/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';

import { generateTransformSecondaryAuthHeaders } from '../../../../common/utils/transform_api_key';
import type { StartTransformsRequestSchema } from '../../../../common/api_schemas/start_transforms';

import type { TransformRequestHandlerContext } from '../../../services/license';

import type { RouteDependencies } from '../../../types';

import { wrapError, wrapEsError } from '../../utils/error_utils';

import { reauthorizeAndStartTransforms } from './reauthorize_and_start_transforms';

export const routeHandlerFactory: (
  routeDependencies: RouteDependencies
) => RequestHandler<
  undefined,
  undefined,
  StartTransformsRequestSchema,
  TransformRequestHandlerContext
> = (routeDependencies) => async (ctx, req, res) => {
  const { coreStart, security: securityStart } = routeDependencies;

  try {
    const transformsInfo = req.body;
    const { elasticsearch } = coreStart;
    const esClient = elasticsearch.client.asScoped(req).asCurrentUser;

    let apiKeyWithCurrentUserPermission;

    // If security is not enabled or available, user should not have the need to reauthorize
    // in that case, start anyway
    if (securityStart) {
      apiKeyWithCurrentUserPermission = await securityStart.authc.apiKeys.grantAsInternalUser(req, {
        name: `auto-generated-transform-api-key`,
        role_descriptors: {},
      });
    }
    const secondaryAuth = generateTransformSecondaryAuthHeaders(apiKeyWithCurrentUserPermission);

    const authorizedTransforms = await reauthorizeAndStartTransforms(transformsInfo, esClient, {
      ...(secondaryAuth ? secondaryAuth : {}),
    });
    return res.ok({ body: authorizedTransforms });
  } catch (e) {
    return res.customError(wrapError(wrapEsError(e)));
  }
};
