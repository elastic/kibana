/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core-capabilities-common';

import { TRANSFORM_PLUGIN_ID } from './constants/plugin';

import { ENDPOINT_PRIVILEGES } from './constants';

export type TransformPrivilege =
  | 'canGetTransform'
  | 'canCreateTransform'
  | 'canDeleteTransform'
  | 'canStartStopTransform';

export interface FleetAuthz {
  fleet: {
    all: boolean;
    setup: boolean;
    readEnrollmentTokens: boolean;
    readAgentPolicies: boolean;
  };

  integrations: {
    readPackageInfo: boolean;
    readInstalledPackages: boolean;
    installPackages: boolean;
    upgradePackages: boolean;
    removePackages: boolean;
    uploadPackages: boolean;

    readPackageSettings: boolean;
    writePackageSettings: boolean;

    readIntegrationPolicies: boolean;
    writeIntegrationPolicies: boolean;
  };

  packagePrivileges?: {
    [packageName: string]: {
      actions: {
        [key: string]: {
          executePackageAction: boolean;
        };
      };
    };
  };
}

interface CalculateParams {
  fleet: {
    all: boolean;
    setup: boolean;
  };

  integrations: {
    all: boolean;
    read: boolean;
  };

  isSuperuser: boolean;
}

export const calculateAuthz = ({
  fleet,
  integrations,
  isSuperuser,
}: CalculateParams): FleetAuthz => ({
  fleet: {
    all: fleet.all && (integrations.all || integrations.read),

    // These are currently used by Fleet Server setup
    setup: fleet.all || fleet.setup,
    readEnrollmentTokens: fleet.all || fleet.setup,
    readAgentPolicies: fleet.all || fleet.setup,
  },

  integrations: {
    readPackageInfo: fleet.all || fleet.setup || integrations.all || integrations.read,
    readInstalledPackages: integrations.all || integrations.read,
    installPackages: fleet.all && integrations.all,
    upgradePackages: fleet.all && integrations.all,
    removePackages: fleet.all && integrations.all,
    uploadPackages: isSuperuser,

    readPackageSettings: fleet.all && integrations.all,
    writePackageSettings: fleet.all && integrations.all,

    readIntegrationPolicies: fleet.all && (integrations.all || integrations.read),
    writeIntegrationPolicies: fleet.all && integrations.all,
  },
});

export function calculatePackagePrivilegesFromCapabilities(
  capabilities: Capabilities | undefined
): FleetAuthz['packagePrivileges'] {
  if (!capabilities) {
    return {};
  }

  const endpointActions = Object.entries(ENDPOINT_PRIVILEGES).reduce(
    (acc, [privilege, { privilegeName }]) => {
      return {
        ...acc,
        [privilege]: {
          executePackageAction: (capabilities.siem && capabilities.siem[privilegeName]) || false,
        },
      };
    },
    {}
  );

  const transformActions = Object.keys(capabilities.transform).reduce((acc, privilegeName) => {
    return {
      ...acc,
      [privilegeName]: {
        executePackageAction: capabilities.transform[privilegeName] || false,
      },
    };
  }, {});

  return {
    endpoint: {
      actions: endpointActions,
    },
    transform: {
      actions: transformActions,
    },
  };
}

function getAuthorizationFromPrivileges(
  kibanaPrivileges: Array<{
    resource?: string;
    privilege: string;
    authorized: boolean;
  }>,
  prefix: string,
  searchPrivilege: string
): boolean {
  const privilege = kibanaPrivileges.find((p) =>
    p.privilege.endsWith(`${prefix}${searchPrivilege}`)
  );
  return privilege?.authorized || false;
}

export function calculatePackagePrivilegesFromKibanaPrivileges(
  kibanaPrivileges:
    | Array<{
        resource?: string;
        privilege: string;
        authorized: boolean;
      }>
    | undefined
): FleetAuthz['packagePrivileges'] {
  if (!kibanaPrivileges || !kibanaPrivileges.length) {
    return {};
  }

  const endpointActions = Object.entries(ENDPOINT_PRIVILEGES).reduce(
    (acc, [privilege, { appId, privilegeSplit, privilegeName }]) => {
      const kibanaPrivilege = getAuthorizationFromPrivileges(
        kibanaPrivileges,
        `${appId}${privilegeSplit}`,
        privilegeName
      );
      return {
        ...acc,
        [privilege]: {
          executePackageAction: kibanaPrivilege,
        },
      };
    },
    {}
  );

  const hasTransformAdmin = getAuthorizationFromPrivileges(
    kibanaPrivileges,
    `${TRANSFORM_PLUGIN_ID}-`,
    `admin`
  );
  const transformActions: {
    [key in TransformPrivilege]: {
      executePackageAction: boolean;
    };
  } = {
    canCreateTransform: {
      executePackageAction: hasTransformAdmin,
    },
    canDeleteTransform: {
      executePackageAction: hasTransformAdmin,
    },
    canStartStopTransform: {
      executePackageAction: hasTransformAdmin,
    },
    canGetTransform: {
      executePackageAction: getAuthorizationFromPrivileges(
        kibanaPrivileges,
        `${TRANSFORM_PLUGIN_ID}-`,
        `read`
      ),
    },
  };

  return {
    endpoint: {
      actions: endpointActions,
    },
    transform: {
      actions: transformActions,
    },
  };
}
