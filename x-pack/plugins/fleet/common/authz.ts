/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
}

export interface FleetPackageAuthz {
  packageName: string;
  packageActions: string[];
  manageAgentPolicy: boolean; // or manageAll to be equivalent of legacy fleet.all
  managePackagePolicy: boolean;
  executePackageAction: boolean;
  readPackageActionResult: boolean;
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

    // manage_all || manage_package_policy || manage_agent_policy
    writeIntegrationPolicies: fleet.all && integrations.all,
  },
});
