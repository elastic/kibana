/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface SetupState {
  cloud: {
    available: boolean;
    required: boolean;
  };
  data: {
    available: boolean;
  };
  packages: {
    installed: boolean;
  };
  permissions: {
    configured: boolean;
  };
  apm_policy: {
    installed: boolean;
  };
  collector_policy: {
    installed: boolean;
  };
  symbolizer_policy: {
    installed: boolean;
  };
  resource_management: {
    enabled: boolean;
  };
  resources: {
    created: boolean;
  };
  settings: {
    configured: boolean;
  };
}

export function createDefaultSetupState(): SetupState {
  return {
    cloud: {
      available: false,
      required: true,
    },
    data: {
      available: false,
    },
    packages: {
      installed: false,
    },
    permissions: {
      configured: false,
    },
    apm_policy: {
      installed: false,
    },
    collector_policy: {
      installed: false,
    },
    symbolizer_policy: {
      installed: false,
    },
    resource_management: {
      enabled: false,
    },
    resources: {
      created: false,
    },
    settings: {
      configured: false,
    },
  };
}

export function areResourcesSetup(state: SetupState): boolean {
  return (
    state.resource_management.enabled &&
    state.resources.created &&
    state.packages.installed &&
    state.permissions.configured &&
    state.apm_policy.installed &&
    state.collector_policy.installed &&
    state.symbolizer_policy.installed &&
    state.settings.configured
  );
}

export function mergePartialSetupStates(
  base: SetupState,
  partials: Array<Partial<SetupState>>
): SetupState {
  return partials.reduce<SetupState>((previous, current) => {
    return { ...previous, ...current };
  }, base);
}
