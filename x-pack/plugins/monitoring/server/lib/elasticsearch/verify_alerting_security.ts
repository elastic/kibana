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
  private static _encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;

  public static readonly init = (encryptedSavedObjects: EncryptedSavedObjectsPluginSetup) => {
    AlertingSecurity._encryptedSavedObjects = encryptedSavedObjects;
  };

  public static readonly getSecurityHealth = async (
    context: RequestHandlerContext
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

    if (!AlertingSecurity._encryptedSavedObjects) {
      throw Error(
        'AlertingSecurity.init() needs to be set before using AlertingSecurity.getSecurityHealth'
      );
    }

    return {
      isSufficientlySecure: !isSecurityEnabled || (isSecurityEnabled && isTLSEnabled),
      hasPermanentEncryptionKey: !AlertingSecurity._encryptedSavedObjects
        .usingEphemeralEncryptionKey,
    };
  };
}
