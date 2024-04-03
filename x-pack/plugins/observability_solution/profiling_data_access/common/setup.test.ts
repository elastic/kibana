/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  mergePartialSetupStates,
  PartialSetupState,
  areResourcesSetup,
  createDefaultSetupState,
} from './setup';

const createDataState = (available: boolean): PartialSetupState => ({ data: { available } });

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
    const mergedState = mergePartialSetupStates(defaultSetupState, [createDataState(true)]);
    expect(mergedState.data.available).toEqual(true);
    expect(mergedState.settings.configured).toEqual(false);
    expect(mergedState.resources.created).toEqual(false);
  });

  it('should deeply nested partial states with overlap', () => {
    const mergedState = mergePartialSetupStates(defaultSetupState, [
      createResourceState({ created: true, enabled: true }),
    ]);

    expect(mergedState.resource_management.enabled).toEqual(true);
    expect(mergedState.resources.created).toEqual(true);
  });

  it('returns false when resource management is not enabled', () => {
    const mergedState = mergePartialSetupStates(defaultSetupState, [
      createResourceState({ enabled: false, created: true }),
      createSettingsState(true),
    ]);

    expect(areResourcesSetup(mergedState)).toBeFalsy();
  });

  it('returns false when resources are not created', () => {
    const mergedState = mergePartialSetupStates(defaultSetupState, [
      createResourceState({ enabled: true, created: false }),
      createSettingsState(true),
    ]);

    expect(areResourcesSetup(mergedState)).toBeFalsy();
  });

  it('returns false when settings are not configured', () => {
    const mergedState = mergePartialSetupStates(defaultSetupState, [
      createResourceState({ enabled: true, created: true }),
      createSettingsState(false),
    ]);

    expect(areResourcesSetup(mergedState)).toBeFalsy();
  });

  it('returns true when all checks are valid', () => {
    const mergedState = mergePartialSetupStates(defaultSetupState, [
      createResourceState({ enabled: true, created: true }),
      createSettingsState(true),
    ]);

    expect(areResourcesSetup(mergedState)).toBeTruthy();
  });
});
