/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpResponsePayload, ResponseError } from '@kbn/core-http-server';
import { ILicense } from '@kbn/licensing-plugin/server';
import {
  LICENSE_MISSING_ERROR,
  LICENSE_NOT_ACTIVE_ERROR,
  LICENSE_NOT_SUPPORTED_ERROR,
} from '../../common/constants';
import {
  SupportedMethod,
  SyntheticsRestApiRouteFactory,
  SyntheticsRoute,
  SyntheticsRouteHandler,
} from './types';

function getDefaultWriteAccessFlag(method: SupportedMethod) {
  // if the method is not GET, it defaults to requiring write access
  return method !== 'GET';
}

export const createSyntheticsRouteWithAuth = <
  ClientContract extends HttpResponsePayload | ResponseError = any
>(
  routeCreator: SyntheticsRestApiRouteFactory
): SyntheticsRoute<ClientContract> => {
  const restRoute = routeCreator();
  const { handler, method, path, options, writeAccess, ...rest } = restRoute;
  const licenseCheckHandler: SyntheticsRouteHandler<ClientContract> = async ({
    context,
    response,
    ...restProps
  }) => {
    const { statusCode, message } = licenseCheck((await context.licensing).license);
    if (statusCode === 200) {
      return handler({
        context,
        response,
        ...restProps,
      });
    }
    switch (statusCode) {
      case 400:
        return response.badRequest({ body: { message } });
      case 401:
        return response.unauthorized({ body: { message } });
      case 403:
        return response.forbidden({ body: { message } });
      default:
        throw new Error('Failed to validate the license');
    }
  };

  return {
    method,
    path,
    options,
    handler: licenseCheckHandler,
    ...rest,
    writeAccess: writeAccess ?? getDefaultWriteAccessFlag(method),
  };
};

export interface UMLicenseStatusResponse {
  statusCode: number;
  message: string;
}
export type UMLicenseCheck = (
  license?: Pick<ILicense, 'isActive' | 'hasAtLeast'>
) => UMLicenseStatusResponse;

export const licenseCheck: UMLicenseCheck = (license) => {
  if (license === undefined) {
    return {
      message: LICENSE_MISSING_ERROR,
      statusCode: 400,
    };
  }
  if (!license.hasAtLeast('basic')) {
    return {
      message: LICENSE_NOT_SUPPORTED_ERROR,
      statusCode: 401,
    };
  }
  if (license.isActive === false) {
    return {
      message: LICENSE_NOT_ACTIVE_ERROR,
      statusCode: 403,
    };
  }
  return {
    message: 'License is valid and active',
    statusCode: 200,
  };
};
