/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CapabilitiesProvider, KibanaRequest } from '@kbn/core/server';
import type { Capabilities } from '@kbn/core/types';

import { appContextService } from '.';

// {
//   "cluster": [],
//   "global": [],
//   "indices": [],
//   "applications": [
//     {
//       "application": "kibana-.kibana",
//       "privileges": [
//         "feature_fleet.read",
//         "feature_integrations.manage_package_policy",
//         "feature_fleetv2.all",
//         "feature_integrations.minimal_read",
//         "feature_integrations.execute_package_action",
//       ],
//       "resources": [
//         "package:endpoint:action:*",
//         "package:endpoint:action:isolate_hosts",
//         "space:default",
//         "package:endpoint:*"
//       ]
//     }
//   ],
//   "run_as": []
// }

export const capabilitiesProvider: CapabilitiesProvider = () => {
  // TODO generate for each package and action
  return {
    packages: {
      endpoint: {
        managePackagePolicy: false,
        actions: {
          all: {
            executePackageAction: false,
          },
          isolate_hosts: {
            executePackageAction: false,
          },
        },
        spaces: {
          all: false,
        },
      },
    },
  } as any; // TODO format not compatible with Capabilities
};

export const capabilitiesSwitcher = async (
  request: KibanaRequest,
  uiCapabilities: Capabilities,
  useDefaultCapabilities: boolean
) => {
  if (request.auth.isAuthenticated) {
    const privileges = await appContextService
      .getClusterClient()
      .asScoped(request)
      .asCurrentUser.security.getUserPrivileges();

    // console.log(JSON.stringify(privileges, null, 2));

    const capabilities = privileges.applications
      .filter((app) => app.application === 'kibana-.kibana')
      .map((app) => {
        const packageRes = app.resources.find((res) => res.match('package:[^:]*'));
        let result: any = {};
        if (packageRes) {
          const pkg = packageRes.split(':')[1];
          const hasManagePackagePolicy = app.privileges.includes(
            'feature_integrations.manage_package_policy'
          );
          const spaces = app.resources
            .filter((res) => res.match('space:.*'))
            .map((res) => res.split(':')[1])
            .reduce((acc: any, curr: any) => ({ ...acc, [curr]: true }), {});
          result = {
            ...result,
            [pkg]: {
              managePackagePolicy: hasManagePackagePolicy,
              spaces,
            },
          };
        }
        app.resources
          .filter((res) => res.match('package:.*:action:.*'))
          .forEach((packageActionRes) => {
            if (packageActionRes) {
              const [, pkg, , action] = packageActionRes.split(':');
              const hasExecutePackageAction = app.privileges.includes(
                'feature_integrations.execute_package_action'
              );
              result = {
                ...result,
                [pkg]: {
                  ...result[pkg],
                  actions: {
                    ...result[pkg].actions,
                    [action === '*' ? 'all' : action]: {
                      executePackageAction: hasExecutePackageAction,
                    },
                  },
                },
              };
            }
          });

        return result;
      })
      .reduce((acc, curr) => {
        return { ...acc, ...curr };
      }, {});

    // console.log(JSON.stringify({packages: capabilities}, null, 2));
    return { packages: capabilities };
  }

  return {};
};
