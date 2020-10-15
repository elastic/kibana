/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from 'kibana/server';
import { EncryptedSavedObjectsPluginSetup } from '../../../../encrypted_saved_objects/server';

export interface AlertingFrameworkHealth {
  isSufficientlySecure: boolean;
  hasPermanentEncryptionKey: boolean;
}

export interface XPackUsageSecurity {
  security?: {
    enabled?: boolean;
    ssl?: {
      http?: {
        enabled?: boolean;
      };
    };
  };
}

export class AlertingSecurity {
  public static readonly getSecurityHealth = async (
    context: RequestHandlerContext,
    encryptedSavedObjects?: EncryptedSavedObjectsPluginSetup
  ): Promise<AlertingFrameworkHealth> => {
    const {
      security: {
        enabled: isSecurityEnabled = false,
        ssl: { http: { enabled: isTLSEnabled = false } = {} } = {},
      } = {},
    }: XPackUsageSecurity = await context.core.elasticsearch.legacy.client.callAsInternalUser(
      'transport.request',
      {
        method: 'GET',
        path: '/_xpack/usage',
      }
    );

    return {
      isSufficientlySecure: !isSecurityEnabled || (isSecurityEnabled && isTLSEnabled),
      hasPermanentEncryptionKey: !encryptedSavedObjects?.usingEphemeralEncryptionKey,
    };
  };
}
