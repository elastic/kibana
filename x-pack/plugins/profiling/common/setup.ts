/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import type { RecursivePartial } from '@elastic/eui';

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
  policies: {
    apm: {
      installed: boolean;
    };
    collector: {
      installed: boolean;
    };
    symbolizer: {
      installed: boolean;
    };
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

export type PartialSetupState = RecursivePartial<SetupState>;

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
    policies: {
      apm: {
        installed: false,
      },
      collector: {
        installed: false,
      },
      symbolizer: {
        installed: false,
      },
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
    state.policies.apm.installed &&
    state.policies.collector.installed &&
    state.policies.symbolizer.installed &&
    state.settings.configured
  );
}

function mergeRecursivePartial<T>(base: T, partial: RecursivePartial<T>): T {
  return merge(base, partial);
}

export function mergePartialSetupStates(
  base: SetupState,
  partials: PartialSetupState[]
): SetupState {
  return partials.reduce<SetupState>(mergeRecursivePartial, base);
}
