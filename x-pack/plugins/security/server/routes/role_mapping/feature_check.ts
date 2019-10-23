/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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

export function defineRoleMappingFeatureCheckRoute({
  router,
  clusterClient,
}: RouteDefinitionParams) {
  router.get(
    {
      path: '/internal/security/role_mapping_feature_check',
      validate: false,
    },
    createLicensedRouteHandler(async (context, request, response) => {
      const { has_all_requested: canManageRoleMappings } = await clusterClient
        .asScoped(request)
        .callAsCurrentUser('shield.hasPrivileges', {
          body: {
            cluster: ['manage_security'],
          },
        });

      if (!canManageRoleMappings) {
        return response.ok({
          body: {
            canManageRoleMappings,
          },
        });
      }

      const nodeScriptSettings: NodeSettingsResponse | {} = await clusterClient.callAsInternalUser(
        'transport.request',
        {
          method: 'GET',
          path: '/_nodes/settings?filter_path=nodes.*.settings.script',
        }
      );

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

      const xpackUsage: XPackUsageResponse = await clusterClient.callAsInternalUser(
        'transport.request',
        {
          method: 'GET',
          path: '/_xpack/usage',
        }
      );

      const hasCompatibleRealms = Object.entries(xpackUsage.security.realms).some(
        ([realmName, realm]) => {
          return !INCOMPATIBLE_REALMS.includes(realmName) && realm.available && realm.enabled;
        }
      );

      return response.ok({
        body: {
          canManageRoleMappings,
          canUseInlineScripts,
          canUseStoredScripts,
          hasCompatibleRealms,
        },
      });
    })
  );
}

function usesCustomScriptSettings(
  nodeResponse: NodeSettingsResponse | {}
): nodeResponse is NodeSettingsResponse {
  return nodeResponse.hasOwnProperty('nodes');
}
