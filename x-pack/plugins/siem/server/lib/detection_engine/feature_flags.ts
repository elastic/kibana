/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// TODO: (LIST-FEATURE) Delete this file once the lists features are within the product and in a particular version

// Very temporary file where we put our feature flags for detection lists.
// We need to use an environment variable and CANNOT use a kibana.dev.yml setting because some definitions
// of things are global in the modules are are initialized before the init of the server has a chance to start.
// Set this in your .bashrc/.zshrc to turn on lists feature, export ELASTIC_XPACK_SIEM_LISTS_FEATURE=true

// NOTE: This feature is forwards and backwards compatible but forwards compatible is not guaranteed.
// Once you enable this and begin using it you might not be able to easily go back back.
// So it's best to not turn it on unless you are developing code.
export const listsEnvFeatureFlagName = 'ELASTIC_XPACK_SIEM_LISTS_FEATURE';

// This is for setFeatureFlagsForTestsOnly and unSetFeatureFlagsForTestsOnly only to use
let setFeatureFlagsForTestsOnlyCalled = false;

// Use this to detect if the lists feature is enabled or not
export const hasListsFeature = (): boolean => {
  return process.env[listsEnvFeatureFlagName]?.trim().toLowerCase() === 'true';
};

// This is for tests only to use in your beforeAll() calls
export const setFeatureFlagsForTestsOnly = (): void => {
  if (setFeatureFlagsForTestsOnlyCalled) {
    throw new Error(
      'In your tests you need to ensure in your afterEach/afterAll blocks you are calling unSetFeatureFlagsForTestsOnly'
    );
  } else {
    setFeatureFlagsForTestsOnlyCalled = true;
    process.env[listsEnvFeatureFlagName] = 'true';
  }
};

// This is for tests only to use in your afterAll() calls
export const unSetFeatureFlagsForTestsOnly = (): void => {
  if (!setFeatureFlagsForTestsOnlyCalled) {
    throw new Error(
      'In your tests you need to ensure in your beforeEach/beforeAll blocks you are calling setFeatureFlagsForTestsOnly'
    );
  } else {
    delete process.env[listsEnvFeatureFlagName];
    setFeatureFlagsForTestsOnlyCalled = false;
  }
};
