/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { set } from 'lodash';
import { isDeprecationLoggingEnabled } from '../es_deprecation_logging_apis';

interface KibanaLegacyServer extends Legacy.Server {
  usage: {
    collectorSet: {
      makeUsageCollector: any;
      register: any;
    };
  };
}

interface UpgradeAssistantSavedObjectAttributes {
  telemetry: {
    ui_open: {
      overview: number;
      cluster: number;
      indices: number;
    };
  };
}

export async function fetchUpgradeAssistantMetrics(callCluster: any, server: Legacy.Server) {
  const { getSavedObjectsRepository } = server.savedObjects;
  const savedObjectsRepository = getSavedObjectsRepository(callCluster);
  const upgradeAssistant = await savedObjectsRepository.get(
    'upgrade-assistant',
    'upgrade-assistant'
  );
  const loggerDeprecationCallResult = await callCluster('cluster.getSettings', { ignore: [404] });

  const getUIOpen = (upgradeAssistantAttrs: any): UpgradeAssistantSavedObjectAttributes => {
    const upgradeAssistantAttrsKeys = Object.keys(upgradeAssistantAttrs);
    const uiOpenObj = {};

    upgradeAssistantAttrsKeys.forEach(key => {
      set(uiOpenObj, key, upgradeAssistantAttrs[key]);
    });

    return uiOpenObj as UpgradeAssistantSavedObjectAttributes;
  };

  return {
    telemetry: {
      ui_open: {
        overview: 0,
        cluster: 0,
        indices: 0,
        ...getUIOpen(upgradeAssistant.attributes).telemetry.ui_open,
      },
    },
    features: {
      deprecation_logging: {
        enabled: isDeprecationLoggingEnabled(loggerDeprecationCallResult),
      },
    },
  };
}

export function makeUpgradeAssistantUsageCollector(server: Legacy.Server) {
  const kbnServer = server as KibanaLegacyServer;
  const upgradeAssistantUsageCollector = kbnServer.usage.collectorSet.makeUsageCollector({
    type: 'upgrade_assistant',
    fetch: async (callCluster: any) => fetchUpgradeAssistantMetrics(callCluster, server),
  });

  kbnServer.usage.collectorSet.register(upgradeAssistantUsageCollector);
}
