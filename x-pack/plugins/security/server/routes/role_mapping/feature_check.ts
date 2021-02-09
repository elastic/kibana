/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from 'src/core/server';
import { createLicensedRouteHandler } from '../licensed_route_handler';
import { RouteDefinitionParams } from '..';

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

export function defineRoleMappingFeatureCheckRoute({ router, logger }: RouteDefinitionParams) {
  router.get(
    {
      path: '/internal/security/_check_role_mapping_features',
      validate: false,
    },
    createLicensedRouteHandler(async (context, request, response) => {
      const {
        body: { has_all_requested: canManageRoleMappings },
      } = await context.core.elasticsearch.client.asCurrentUser.security.hasPrivileges<{
        has_all_requested: boolean;
      }>({ body: { cluster: ['manage_security'] } });

      if (!canManageRoleMappings) {
        return response.ok({
          body: {
            canManageRoleMappings,
          },
        });
      }

      const enabledFeatures = await getEnabledRoleMappingsFeatures(
        context.core.elasticsearch.client.asInternalUser,
        logger
      );

      return response.ok({
        body: {
          ...enabledFeatures,
          canManageRoleMappings,
        },
      });
    })
  );
}

async function getEnabledRoleMappingsFeatures(esClient: ElasticsearchClient, logger: Logger) {
  logger.debug(`Retrieving role mappings features`);

  const nodeScriptSettingsPromise = esClient.nodes
    .info<NodeSettingsResponse>({ filter_path: 'nodes.*.settings.script' })
    .then(({ body }) => body)
    .catch((error) => {
      // fall back to assuming that node settings are unset/at their default values.
      // this will allow the role mappings UI to permit both role template script types,
      // even if ES will disallow it at mapping evaluation time.
      logger.error(`Error retrieving node settings for role mappings: ${error}`);
      return {};
    });

  // `transport.request` is potentially unsafe when combined with untrusted user input.
  // Do not augment with such input.
  const xpackUsagePromise = esClient.transport
    .request({ method: 'GET', path: '/_xpack/usage' })
    .then(({ body }) => body as XPackUsageResponse)
    .catch((error) => {
      // fall back to no external realms configured.
      // this will cause a warning in the UI about no compatible realms being enabled, but will otherwise allow
      // the mappings screen to function correctly.
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
    canUseStoredScripts = Object.values(nodeScriptSettings.nodes).some((node) => {
      const allowedTypes = node.settings.script.allowed_types;
      return !allowedTypes || allowedTypes.includes('stored');
    });

    canUseInlineScripts = Object.values(nodeScriptSettings.nodes).some((node) => {
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
}

function usesCustomScriptSettings(
  nodeResponse: NodeSettingsResponse | {}
): nodeResponse is NodeSettingsResponse {
  return nodeResponse.hasOwnProperty('nodes');
}
