/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get } from 'lodash';
import { ILegacyScopedClusterClient } from 'src/core/server';

interface DeprecationLoggingStatus {
  isEnabled: boolean;
}

export async function getDeprecationLoggingStatus(
  dataClient: ILegacyScopedClusterClient
): Promise<DeprecationLoggingStatus> {
  const response = await dataClient.callAsCurrentUser('cluster.getSettings', {
    includeDefaults: true,
  });

  return {
    isEnabled: isDeprecationLoggingEnabled(response),
  };
}

export async function setDeprecationLogging(
  dataClient: ILegacyScopedClusterClient,
  isEnabled: boolean
): Promise<DeprecationLoggingStatus> {
  const response = await dataClient.callAsCurrentUser('cluster.putSettings', {
    body: {
      transient: {
        'logger.deprecation': isEnabled ? 'WARN' : 'ERROR',
      },
    },
  });

  return {
    isEnabled: isDeprecationLoggingEnabled(response),
  };
}

export function isDeprecationLoggingEnabled(settings: any) {
  const deprecationLogLevel = ['default', 'persistent', 'transient'].reduce(
    (currentLogLevel, settingsTier) =>
      get(settings, [settingsTier, 'logger', 'deprecation'], currentLogLevel),
    'WARN'
  );

  return ['ALL', 'TRACE', 'DEBUG', 'INFO', 'WARN'].includes(deprecationLogLevel);
}
