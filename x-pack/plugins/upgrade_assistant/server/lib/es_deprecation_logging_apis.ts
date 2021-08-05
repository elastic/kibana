/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { IScopedClusterClient } from 'src/core/server';

interface DeprecationLoggingStatus {
  isEnabled: boolean;
  isLoggerDeprecationEnabled: boolean;
}

export async function getDeprecationLoggingStatus(
  dataClient: IScopedClusterClient
): Promise<DeprecationLoggingStatus> {
  const { body: response } = await dataClient.asCurrentUser.cluster.getSettings({
    include_defaults: true,
  });

  return {
    isEnabled: isClusterDeprecationLoggingEnabled(response),
    isLoggerDeprecationEnabled: isDeprecationLoggingEnabled(response),
  };
}

export async function setDeprecationLogging(
  dataClient: IScopedClusterClient,
  isEnabled: boolean
): Promise<DeprecationLoggingStatus> {
  const { body: loggerDeprecationResponse } = await dataClient.asCurrentUser.cluster.putSettings({
    body: {
      persistent: {
        'logger.deprecation': isEnabled ? 'WARN' : 'ERROR',
      },
    },
  });

  await dataClient.asCurrentUser.cluster.putSettings({
    body: {
      persistent: {
        'cluster.deprecation_indexing.enabled': isEnabled,
      },
    },
  });

  return {
    isEnabled,
    isLoggerDeprecationEnabled: isDeprecationLoggingEnabled(loggerDeprecationResponse),
  };
}

export function isClusterDeprecationLoggingEnabled(settings: any) {
  const clusterDeprecationLoggingEnabled = ['default', 'persistent', 'transient'].reduce(
    (currentLogLevel, settingsTier) =>
      get(settings, [settingsTier, 'cluster', 'deprecation_indexing', 'enabled'], currentLogLevel),
    'false'
  ) as string;

  return clusterDeprecationLoggingEnabled === 'true';
}

export function isDeprecationLoggingEnabled(settings: any) {
  const deprecationLogLevel = ['default', 'persistent', 'transient'].reduce(
    (currentLogLevel, settingsTier) =>
      get(settings, [settingsTier, 'logger', 'deprecation'], currentLogLevel),
    'WARN'
  );

  return ['ALL', 'TRACE', 'DEBUG', 'INFO', 'WARN'].includes(deprecationLogLevel);
}
