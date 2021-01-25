/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { RequestHandlerWrapper } from 'kibana/server';

export const handleDisabledApiKeysError: RequestHandlerWrapper = (handler) => {
  return async (context, request, response) => {
    try {
      return await handler(context, request, response);
    } catch (e) {
      if (isApiKeyDisabledError(e)) {
        return response.badRequest({
          body: new Error(
            i18n.translate('xpack.alerts.api.error.disabledApiKeys', {
              defaultMessage: 'Alerting relies upon API keys which appear to be disabled',
            })
          ),
        });
      }
      throw e;
    }
  };
};

export function isApiKeyDisabledError(e: Error) {
  return e?.message?.includes('api keys are not enabled') ?? false;
}

export function isSecurityPluginDisabledError(e: Error) {
  return e?.message?.includes('no handler found') ?? false;
}
