/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IClusterClient, Logger } from 'src/core/server';

interface Deps {
  logger: Logger;
  clusterClient: IClusterClient;
}

interface NodeSettingsResponse {
  nodes: {
    [nodeId: string]: {
      settings: {
        script: {
          allowed_types?: string[];
          allowed_contexts?: string[];
        };
      };
    };
  };
}

interface XPackUsageResponse {
  security: {
    realms: {
      [realmName: string]: {
        available: boolean;
        enabled: boolean;
      };
    };
  };
}

const INCOMPATIBLE_REALMS = ['file', 'native'];

export const getEnabledRoleMappingsFeatures = async ({ clusterClient, logger }: Deps) => {
  logger.debug(`Retrieving role mappings features`);

  const nodeScriptSettingsPromise: Promise<NodeSettingsResponse> = clusterClient
    .callAsInternalUser('transport.request', {
      method: 'GET',
      path: '/_nodes/settings?filter_path=nodes.*.settings.script',
    })
    .catch(error => {
      logger.error(`Error retrieving node settings for role mappings: ${error}`);
      return {};
    });

  const xpackUsagePromise: Promise<XPackUsageResponse> = clusterClient
    .callAsInternalUser('transport.request', {
      method: 'GET',
      path: '/_xpack/usage',
    })
    .catch(error => {
      logger.error(`Error retrieving XPack usage info for role mappings: ${error}`);
      return {
        security: {
          realms: {},
        },
      } as XPackUsageResponse;
    });

  const [nodeScriptSettings, xpackUsage] = await Promise.all([
    nodeScriptSettingsPromise,
    xpackUsagePromise,
  ]);

  let canUseStoredScripts = true;
  let canUseInlineScripts = true;
  if (usesCustomScriptSettings(nodeScriptSettings)) {
    canUseStoredScripts = Object.values(nodeScriptSettings.nodes).some(node => {
      const allowedTypes = node.settings.script.allowed_types;
      return !allowedTypes || allowedTypes.includes('stored');
    });

    canUseInlineScripts = Object.values(nodeScriptSettings.nodes).some(node => {
      const allowedTypes = node.settings.script.allowed_types;
      return !allowedTypes || allowedTypes.includes('inline');
    });
  }

  const hasCompatibleRealms = Object.entries(xpackUsage.security.realms).some(
    ([realmName, realm]) => {
      return !INCOMPATIBLE_REALMS.includes(realmName) && realm.available && realm.enabled;
    }
  );

  return {
    hasCompatibleRealms,
    canUseStoredScripts,
    canUseInlineScripts,
  };
};

function usesCustomScriptSettings(
  nodeResponse: NodeSettingsResponse | {}
): nodeResponse is NodeSettingsResponse {
  return nodeResponse.hasOwnProperty('nodes');
}
