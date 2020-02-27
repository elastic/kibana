/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  APP_CLUSTER_PRIVILEGES,
  APP_INDEX_PRIVILEGES,
} from '../../../../../legacy/plugins/transform/common/constants';
// NOTE: now we import it from our "public" folder, but when the Authorisation lib
// will move to the "es_ui_shared" plugin, it will be imported from its "static" folder
import { Privileges } from '../../../../../legacy/plugins/transform/public/app/lib/authorization';

import { RouteDependencies } from '../../types';
import { addBasePath } from '../index';

// import { Plugins } from '../../shim';

let xpackMainPlugin: any;

export function registerPrivilegesRoute({ router, license, lib }: RouteDependencies) {
  // xpackMainPlugin = plugins.xpack_main;
  router.get(
    { path: addBasePath('privileges'), validate: {} },
    license.guardApiRoute(async (ctx, req, res) => {
      // const xpackInfo = getXpackMainPlugin() && getXpackMainPlugin().info;
      const xpackInfo = {
        feature: (feature: string) => ({
          isAvailable: () => true,
          isEnabled: () => true,
        }),
        isAvailable: () => true,
        isEnabled: () => true,
      };
      if (!xpackInfo) {
        // xpackInfo is updated via poll, so it may not be available until polling has begun.
        // In this rare situation, tell the client the service is temporarily unavailable.
        return res.customError({
          statusCode: 503,
          body: 'Security info unavailable',
        });
      }

      const privilegesResult: Privileges = {
        hasAllPrivileges: true,
        missingPrivileges: {
          cluster: [],
          index: [],
        },
      };

      const securityInfo = xpackInfo && xpackInfo.isAvailable() && xpackInfo.feature('security');
      if (!securityInfo || !securityInfo.isAvailable() || !securityInfo.isEnabled()) {
        // If security isn't enabled, let the user use app.
        return res.ok({ body: privilegesResult });
      }

      // Get cluster priviliges
      const {
        has_all_requested: hasAllPrivileges,
        cluster,
      } = await ctx.transform!.dataClient.callAsCurrentUser('transport.request', {
        path: '/_security/user/_has_privileges',
        method: 'POST',
        body: {
          cluster: APP_CLUSTER_PRIVILEGES,
        },
      });

      // Find missing cluster privileges and set overall app privileges
      privilegesResult.missingPrivileges.cluster = extractMissingPrivileges(cluster);
      privilegesResult.hasAllPrivileges = hasAllPrivileges;

      // Get all index privileges the user has
      const { indices } = await ctx.transform!.dataClient.callAsCurrentUser('transport.request', {
        path: '/_security/user/_privileges',
        method: 'GET',
      });

      // Check if they have all the required index privileges for at least one index
      const oneIndexWithAllPrivileges = indices.find(({ privileges }: { privileges: string[] }) => {
        if (privileges.includes('all')) {
          return true;
        }

        const indexHasAllPrivileges = APP_INDEX_PRIVILEGES.every(privilege =>
          privileges.includes(privilege)
        );

        return indexHasAllPrivileges;
      });

      // If they don't, return list of required index privileges
      if (!oneIndexWithAllPrivileges) {
        privilegesResult.missingPrivileges.index = [...APP_INDEX_PRIVILEGES];
      }

      return res.ok({ body: privilegesResult });
    })
  );
}

function getXpackMainPlugin() {
  return xpackMainPlugin;
}

const extractMissingPrivileges = (privilegesObject: { [key: string]: boolean } = {}): string[] =>
  Object.keys(privilegesObject).reduce((privileges: string[], privilegeName: string): string[] => {
    if (!privilegesObject[privilegeName]) {
      privileges.push(privilegeName);
    }
    return privileges;
  }, []);
