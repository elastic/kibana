/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core-capabilities-common';

import { TRANSFORM_PLUGIN_ID } from './constants/plugin';

import { ENDPOINT_EXCEPTIONS_PRIVILEGES, ENDPOINT_PRIVILEGES } from './constants';

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
    allAgentPolicies: boolean;
    readAgents: boolean;
    allAgents: boolean;
    readSettings: boolean;
    allSettings: boolean;
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

  endpointExceptionsPrivileges?: {
    actions: {
      crudEndpointExceptions: boolean;
      showEndpointExceptions: boolean;
    };
  };
}

interface ReadAllParams {
  all: boolean;
  read: boolean;
}

interface CalculateParams {
  fleet: {
    all: boolean;
    setup: boolean;
    read?: boolean;
    agents?: ReadAllParams;
    agentPolicies?: ReadAllParams;
    settings?: ReadAllParams;
  };

  integrations: ReadAllParams;

  subfeatureEnabled: boolean;
}

type PrivilegeMap = Record<string, { executePackageAction: boolean }>;

export const calculateAuthz = ({
  fleet,
  integrations,
  subfeatureEnabled,
}: CalculateParams): FleetAuthz => {
  // TODO remove fallback when the feature flag is removed
  const fleetAuthz: FleetAuthz['fleet'] = subfeatureEnabled
    ? {
        all: fleet.all && (integrations.all || integrations.read),

        readAgents: (fleet.agents?.read || fleet.agents?.all) ?? false,
        allAgents: (fleet.all || fleet.agents?.all) ?? false,
        readSettings: (fleet.settings?.read || fleet.settings?.all) ?? false,
        allSettings: fleet.settings?.all ?? false,
        allAgentPolicies: fleet.agentPolicies?.all ?? false,

        // These are currently used by Fleet Server setup
        setup: fleet.all || fleet.setup,
        readEnrollmentTokens: (fleet.all || fleet.setup || fleet.agents?.all) ?? false,
        readAgentPolicies:
          (fleet.all || fleet.read || fleet.setup || fleet.agentPolicies?.read) ?? false,
      }
    : {
        all: fleet.all && (integrations.all || integrations.read),

        readAgents: fleet.all && (integrations.all || integrations.read),
        allAgents: fleet.all && (integrations.all || integrations.read),
        readSettings: fleet.all && (integrations.all || integrations.read),
        allSettings: fleet.all && (integrations.all || integrations.read),
        allAgentPolicies: fleet.all && (integrations.all || integrations.read),

        // These are currently used by Fleet Server setup
        setup: fleet.all || fleet.setup,
        readEnrollmentTokens: (fleet.all || fleet.setup || fleet.agents?.all) ?? false,
        readAgentPolicies:
          (fleet.all || fleet.read || fleet.setup || fleet.agentPolicies?.read) ?? false,
      };

  return {
    fleet: fleetAuthz,
    integrations: {
      readPackageInfo: fleet.all || fleet.setup || integrations.all || integrations.read,
      readInstalledPackages: integrations.all || integrations.read,
      installPackages: fleet.all && integrations.all,
      upgradePackages: fleet.all && integrations.all,
      removePackages: fleet.all && integrations.all,
      uploadPackages: fleet.all && integrations.all,

      readPackageSettings: fleet.all && integrations.all,
      writePackageSettings: fleet.all && integrations.all,

      readIntegrationPolicies:
        ((fleet.all || fleet.read || fleet.agentPolicies?.read) ?? false) &&
        (integrations.all || integrations.read),
      writeIntegrationPolicies:
        ((fleet.all || fleet.agentPolicies?.all) ?? false) && integrations.all,
    },
  };
};

export function calculatePackagePrivilegesFromCapabilities(
  capabilities: Capabilities | undefined
): FleetAuthz['packagePrivileges'] {
  if (!capabilities) {
    return {};
  }

  const endpointActions = Object.entries(ENDPOINT_PRIVILEGES).reduce<PrivilegeMap>(
    (acc, [privilege, { privilegeName }]) => {
      acc[privilege] = {
        executePackageAction:
          (capabilities.siem && (capabilities.siem[privilegeName] as boolean)) || false,
      };
      return acc;
    },
    {}
  );

  const transformActions = Object.keys(capabilities.transform).reduce<PrivilegeMap>(
    (acc, privilegeName) => {
      acc[privilegeName] = {
        executePackageAction: (capabilities.transform[privilegeName] as boolean) || false,
      };
      return acc;
    },
    {}
  );

  return {
    endpoint: {
      actions: endpointActions,
    },
    transform: {
      actions: transformActions,
    },
  };
}

export function calculateEndpointExceptionsPrivilegesFromCapabilities(
  capabilities: Capabilities | undefined
): FleetAuthz['endpointExceptionsPrivileges'] {
  if (!capabilities || !capabilities.siem) {
    return;
  }

  const endpointExceptionsActions = Object.keys(ENDPOINT_EXCEPTIONS_PRIVILEGES).reduce<
    Record<string, boolean>
  >((acc, privilegeName) => {
    acc[privilegeName] = (capabilities.siem[privilegeName] as boolean) || false;
    return acc;
  }, {});

  return {
    actions: endpointExceptionsActions,
  } as FleetAuthz['endpointExceptionsPrivileges'];
}

export function getAuthorizationFromPrivileges({
  kibanaPrivileges,
  searchPrivilege = '',
  prefix = '',
}: {
  kibanaPrivileges: Array<{
    resource?: string;
    privilege: string;
    authorized: boolean;
  }>;
  prefix?: string;
  searchPrivilege?: string;
}): boolean {
  const privilege = kibanaPrivileges.find((p) => {
    if (prefix.length && searchPrivilege.length) {
      return p.privilege.endsWith(`${prefix}${searchPrivilege}`);
    } else if (prefix.length) {
      return p.privilege.endsWith(`${prefix}`);
    } else if (searchPrivilege.length) {
      return p.privilege.endsWith(`${searchPrivilege}`);
    }
    return false;
  });

  return !!privilege?.authorized;
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

  const endpointActions = Object.entries(ENDPOINT_PRIVILEGES).reduce<PrivilegeMap>(
    (acc, [privilege, { appId, privilegeSplit, privilegeName }]) => {
      const kibanaPrivilege = getAuthorizationFromPrivileges({
        kibanaPrivileges,
        prefix: `${appId}${privilegeSplit}`,
        searchPrivilege: privilegeName,
      });
      acc[privilege] = {
        executePackageAction: kibanaPrivilege,
      };
      return acc;
    },
    {}
  );

  const hasTransformAdmin = getAuthorizationFromPrivileges({
    kibanaPrivileges,
    prefix: `${TRANSFORM_PLUGIN_ID}-`,
    searchPrivilege: `admin`,
  });
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
      executePackageAction: getAuthorizationFromPrivileges({
        kibanaPrivileges,
        prefix: `${TRANSFORM_PLUGIN_ID}-`,
        searchPrivilege: `read`,
      }),
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

export function calculateEndpointExceptionsPrivilegesFromKibanaPrivileges(
  kibanaPrivileges:
    | Array<{
        resource?: string;
        privilege: string;
        authorized: boolean;
      }>
    | undefined
): FleetAuthz['endpointExceptionsPrivileges'] {
  if (!kibanaPrivileges || !kibanaPrivileges.length) {
    return;
  }
  const endpointExceptionsActions = Object.entries(ENDPOINT_EXCEPTIONS_PRIVILEGES).reduce<
    Record<string, boolean>
  >((acc, [privilege, { appId, privilegeSplit, privilegeName }]) => {
    acc[privilege] = getAuthorizationFromPrivileges({
      kibanaPrivileges,
      searchPrivilege: privilegeName,
    });
    return acc;
  }, {});

  return { actions: endpointExceptionsActions } as FleetAuthz['endpointExceptionsPrivileges'];
}
