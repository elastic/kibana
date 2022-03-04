/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { IScopedClusterClient } from 'src/core/server';
import { DeprecationLoggingStatus } from '../../common/types';

export async function getDeprecationLoggingStatus(
  dataClient: IScopedClusterClient
): Promise<DeprecationLoggingStatus> {
  const response = await dataClient.asCurrentUser.cluster.getSettings({
    include_defaults: true,
  });

  return {
    isDeprecationLogIndexingEnabled: isDeprecationLogIndexingEnabled(response),
    isDeprecationLoggingEnabled: isDeprecationLoggingEnabled(response),
  };
}

export async function setDeprecationLogging(
  dataClient: IScopedClusterClient,
  isEnabled: boolean
): Promise<DeprecationLoggingStatus> {
  const response = await dataClient.asCurrentUser.cluster.putSettings({
    body: {
      persistent: {
        'logger.deprecation': isEnabled ? 'WARN' : 'ERROR',
        'cluster.deprecation_indexing.enabled': isEnabled,
      },
      /*
       * If we only set the persistent setting, we can end up in a situation in which a user has
       * set transient on/off. And when toggling and reloading the page the transient setting will
       * have priority over it thus "overriding" whatever the user selected.
       */
      transient: {
        'logger.deprecation': isEnabled ? 'WARN' : 'ERROR',
        'cluster.deprecation_indexing.enabled': isEnabled,
      },
    },
  });

  return {
    isDeprecationLogIndexingEnabled: isEnabled,
    isDeprecationLoggingEnabled: isDeprecationLoggingEnabled(response),
  };
}

export function isDeprecationLogIndexingEnabled(settings: any) {
  const clusterDeprecationLoggingEnabled = ['defaults', 'persistent', 'transient'].reduce(
    (currentLogLevel, settingsTier) =>
      get(settings, [settingsTier, 'cluster', 'deprecation_indexing', 'enabled'], currentLogLevel),
    'false'
  );

  return clusterDeprecationLoggingEnabled === 'true';
}

export function isDeprecationLoggingEnabled(settings: any) {
  const deprecationLogLevel = ['defaults', 'persistent', 'transient'].reduce(
    (currentLogLevel, settingsTier) =>
      get(settings, [settingsTier, 'logger', 'deprecation'], currentLogLevel),
    'WARN'
  );

  return ['ALL', 'TRACE', 'DEBUG', 'INFO', 'WARN'].includes(deprecationLogLevel);
}
