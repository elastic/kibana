/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import { RecursivePartial } from '@kbn/apm-plugin/typings/common';
import type { Logger } from '@kbn/core/server';

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

export function logSetupState(logger: Logger, state: SetupState) {
  logger.info(`cloud.available = ${state.cloud.available}`);
  logger.info(`cloud.required = ${state.cloud.required}`);
  logger.info(`data.available = ${state.data.available}`);
  logger.info(`packages.installed = ${state.packages.installed}`);
  logger.info(`permissions.configured = ${state.permissions.configured}`);
  logger.info(`policies.apm.installed = ${state.policies.apm.installed}`);
  logger.info(`policies.collector.installed = ${state.policies.collector.installed}`);
  logger.info(`policies.symbolizer.installed = ${state.policies.symbolizer.installed}`);
  logger.info(`resource_management.enabled = ${state.resource_management.enabled}`);
  logger.info(`resources.created = ${state.resources.created}`);
  logger.info(`settings.configured = ${state.settings.configured}`);
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
