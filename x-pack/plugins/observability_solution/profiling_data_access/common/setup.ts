/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { RecursivePartial } from '@elastic/eui';
import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { merge } from 'lodash';
import { ProfilingESClient } from './profiling_es_client';

export interface ProfilingSetupOptions {
  client: ProfilingESClient;
  clientWithProfilingAuth: ProfilingESClient;
  soClient: SavedObjectsClientContract;
  logger: Logger;
  spaceId: string;
}

export interface SetupStateType {
  type: 'self-managed';
  setupState: SetupState;
}

export interface SetupState {
  data: {
    available: boolean;
  };
  resource_management: {
    enabled: boolean;
  };
  resources: {
    created: boolean;
    pre_8_9_1_data: boolean;
  };
  settings: {
    configured: boolean;
  };
}

export type PartialSetupState = RecursivePartial<SetupState>;

export function createDefaultSetupState(): SetupState {
  return {
    data: {
      available: false,
    },
    resource_management: {
      enabled: false,
    },
    resources: {
      created: false,
      pre_8_9_1_data: false,
    },
    settings: {
      configured: false,
    },
  };
}

export function areResourcesSetup(state: SetupState): boolean {
  return state.resource_management.enabled && state.resources.created && state.settings.configured;
}

function mergeRecursivePartial<T>(base: T, partial: RecursivePartial<T>): T {
  return merge(base, partial);
}

export function mergePartialSetupStates<T extends SetupState>(
  base: T,
  partials: Array<RecursivePartial<T>>
): T {
  return partials.reduce<T>(mergeRecursivePartial, base);
}
