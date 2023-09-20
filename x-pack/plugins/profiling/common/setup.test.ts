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

const createCloudState = (available: boolean): PartialSetupState => ({ cloud: { available } });
const createDataState = (available: boolean): PartialSetupState => ({ data: { available } });
const createPermissionState = (configured: boolean): PartialSetupState => ({
  permissions: { configured },
});
const createCollectorPolicyState = (installed: boolean): PartialSetupState => ({
  policies: { collector: { installed } },
});
const createSymbolizerPolicyState = (installed: boolean): PartialSetupState => ({
  policies: { symbolizer: { installed } },
});
const createProfilingInApmPolicyState = (profilingEnabled: boolean): PartialSetupState => ({
  policies: { apm: { profilingEnabled } },
});

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

describe('Merging partial state operations', () => {
  const defaultSetupState = createDefaultSetupState();

  it('returns partial states with missing key', () => {
    const mergedState = mergePartialSetupStates(defaultSetupState, [
      createCloudState(true),
      createDataState(true),
    ]);

    expect(mergedState.cloud.available).toEqual(true);
    expect(mergedState.cloud.required).toEqual(true);
    expect(mergedState.data.available).toEqual(true);
  });

  it('should deeply nested partial states with overlap', () => {
    const mergedState = mergePartialSetupStates(defaultSetupState, [
      createCollectorPolicyState(true),
      createSymbolizerPolicyState(true),
    ]);

    expect(mergedState.policies.collector.installed).toEqual(true);
    expect(mergedState.policies.symbolizer.installed).toEqual(true);
  });
  it('returns false when permission is not configured', () => {
    const mergedState = mergePartialSetupStates(defaultSetupState, [
      createCollectorPolicyState(true),
      createSymbolizerPolicyState(true),
      createProfilingInApmPolicyState(true),
      createResourceState({ enabled: true, created: true }),
      createSettingsState(true),
      createPermissionState(false),
    ]);

    expect(areResourcesSetup(mergedState)).toBeFalsy();
  });

  it('returns false when resource management is not enabled', () => {
    const mergedState = mergePartialSetupStates(defaultSetupState, [
      createCollectorPolicyState(true),
      createSymbolizerPolicyState(true),
      createProfilingInApmPolicyState(true),
      createResourceState({ enabled: false, created: true }),
      createSettingsState(true),
      createPermissionState(true),
    ]);

    expect(areResourcesSetup(mergedState)).toBeFalsy();
  });

  it('returns false when resources are not created', () => {
    const mergedState = mergePartialSetupStates(defaultSetupState, [
      createCollectorPolicyState(true),
      createSymbolizerPolicyState(true),
      createProfilingInApmPolicyState(true),
      createResourceState({ enabled: true, created: false }),
      createSettingsState(true),
      createPermissionState(true),
    ]);

    expect(areResourcesSetup(mergedState)).toBeFalsy();
  });

  it('returns false when settings are not configured', () => {
    const mergedState = mergePartialSetupStates(defaultSetupState, [
      createCollectorPolicyState(true),
      createSymbolizerPolicyState(true),
      createProfilingInApmPolicyState(true),
      createResourceState({ enabled: true, created: true }),
      createSettingsState(false),
      createPermissionState(true),
    ]);

    expect(areResourcesSetup(mergedState)).toBeFalsy();
  });

  it('returns true when all checks are valid', () => {
    const mergedState = mergePartialSetupStates(defaultSetupState, [
      createCollectorPolicyState(true),
      createSymbolizerPolicyState(true),
      createProfilingInApmPolicyState(false),
      createResourceState({ enabled: true, created: true }),
      createSettingsState(true),
      createPermissionState(true),
    ]);

    expect(areResourcesSetup(mergedState)).toBeTruthy();
  });

  it('returns false when collector is not found', () => {
    const mergedState = mergePartialSetupStates(defaultSetupState, [
      createCollectorPolicyState(false),
      createSymbolizerPolicyState(true),
      createProfilingInApmPolicyState(false),
      createResourceState({ enabled: true, created: true }),
      createSettingsState(true),
      createPermissionState(true),
    ]);

    expect(areResourcesSetup(mergedState)).toBeFalsy();
  });

  it('returns false when symbolizer is not found', () => {
    const mergedState = mergePartialSetupStates(defaultSetupState, [
      createCollectorPolicyState(true),
      createSymbolizerPolicyState(false),
      createProfilingInApmPolicyState(false),
      createResourceState({ enabled: true, created: true }),
      createSettingsState(true),
      createPermissionState(true),
    ]);

    expect(areResourcesSetup(mergedState)).toBeFalsy();
  });

  it('returns false when profiling is in APM server', () => {
    const mergedState = mergePartialSetupStates(defaultSetupState, [
      createCollectorPolicyState(true),
      createSymbolizerPolicyState(true),
      createProfilingInApmPolicyState(true),
      createResourceState({ enabled: true, created: true }),
      createSettingsState(true),
      createPermissionState(true),
    ]);

    expect(areResourcesSetup(mergedState)).toBeFalsy();
  });
});
