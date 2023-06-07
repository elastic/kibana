/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  areResourcesSetup,
  createDefaultSetupState,
  mergePartialSetupStates,
  PartialSetupState,
} from './setup';

function createCloudState(available: boolean): PartialSetupState {
  return {
    cloud: {
      available,
    },
  };
}

function createDataState(available: boolean): PartialSetupState {
  return {
    data: {
      available,
    },
  };
}

function createPackageState(installed: boolean): PartialSetupState {
  return {
    packages: {
      installed,
    },
  };
}

function createPermissionState(configured: boolean): PartialSetupState {
  return {
    permissions: {
      configured,
    },
  };
}

function createApmPolicyState(installed: boolean): PartialSetupState {
  return {
    policies: {
      apm: {
        installed,
      },
    },
  };
}

function createCollectorPolicyState(installed: boolean): PartialSetupState {
  return {
    policies: {
      collector: {
        installed,
      },
    },
  };
}

function createSymbolizerPolicyState(installed: boolean): PartialSetupState {
  return {
    policies: {
      symbolizer: {
        installed,
      },
    },
  };
}

function createResourceState({
  enabled,
  created,
}: {
  enabled: boolean;
  created: boolean;
}): PartialSetupState {
  return {
    resource_management: {
      enabled,
    },
    resources: {
      created,
    },
  };
}

function createSettingsState(configured: boolean): PartialSetupState {
  return {
    settings: {
      configured,
    },
  };
}

describe('Merging partial states', () => {
  const defaultSetupState = createDefaultSetupState();

  test('0', () => {
    const mergedState = mergePartialSetupStates(defaultSetupState, [
      createCloudState(true),
      createDataState(true),
    ]);

    expect(mergedState.cloud.available).toEqual(true);
    expect(mergedState.cloud.required).toEqual(true);
    expect(mergedState.data.available).toEqual(true);
  });

  test('1', () => {
    const mergedState = mergePartialSetupStates(defaultSetupState, [
      createApmPolicyState(true),
      createCollectorPolicyState(true),
      createSymbolizerPolicyState(true),
    ]);

    expect(mergedState.policies.apm.installed).toEqual(true);
    expect(mergedState.policies.collector.installed).toEqual(true);
    expect(mergedState.policies.symbolizer.installed).toEqual(true);
  });

  test('2', () => {
    const mergedState = mergePartialSetupStates(defaultSetupState, [
      createPackageState(false),
      createApmPolicyState(true),
      createCollectorPolicyState(true),
      createSymbolizerPolicyState(true),
      createPermissionState(false),
      createResourceState({ enabled: true, created: true }),
      createSettingsState(true),
    ]);

    expect(areResourcesSetup(mergedState)).toEqual(false);
  });

  test('3', () => {
    const mergedState = mergePartialSetupStates(defaultSetupState, [
      createPackageState(true),
      createApmPolicyState(true),
      createCollectorPolicyState(true),
      createSymbolizerPolicyState(true),
      createPermissionState(true),
      createResourceState({ enabled: true, created: true }),
      createSettingsState(true),
    ]);

    expect(areResourcesSetup(mergedState)).toEqual(true);
  });
});
