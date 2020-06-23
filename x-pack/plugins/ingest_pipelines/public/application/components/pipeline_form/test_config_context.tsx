/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useCallback, useContext } from 'react';

export interface TestConfig {
  documents?: object[] | undefined;
  verbose: boolean;
}

interface TestConfigContext {
  testConfig: TestConfig;
  setCurrentTestConfig: (config: TestConfig) => void;
}

const TEST_CONFIG_DEFAULT_VALUE = {
  testConfig: {
    verbose: false,
  },
  setCurrentTestConfig: () => {},
};

const TestConfigContext = React.createContext<TestConfigContext>(TEST_CONFIG_DEFAULT_VALUE);

export const useTestConfigContext = () => {
  const ctx = useContext(TestConfigContext);
  if (!ctx) {
    throw new Error(
      '"useTestConfigContext" can only be called inside of TestConfigContext.Provider!'
    );
  }
  return ctx;
};

export const TestConfigContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [testConfig, setTestConfig] = useState<TestConfig>({
    verbose: false,
  });

  const setCurrentTestConfig = useCallback((currentTestConfig: TestConfig): void => {
    setTestConfig(currentTestConfig);
  }, []);

  return (
    <TestConfigContext.Provider
      value={{
        testConfig,
        setCurrentTestConfig,
      }}
    >
      {children}
    </TestConfigContext.Provider>
  );
};
