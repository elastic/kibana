/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useCallback } from 'react';

export interface TestConfig {
  documents?: object[] | undefined;
  verbose?: boolean;
  executeOutput?: {
    docs: object[];
  };
}

interface TestConfigContext {
  testConfig: TestConfig;
  setCurrentTestConfig: (config: TestConfig) => void;
}

const TEST_CONFIG_DEFAULT_VALUE = {
  testConfig: {},
  setCurrentTestConfig: () => {},
};

export const TestConfigContext = React.createContext<TestConfigContext>(TEST_CONFIG_DEFAULT_VALUE);

export const TestConfigContextProvider = ({
  children,
  value,
}: {
  value: TestConfigContext;
  children: React.ReactNode;
}) => {
  return <TestConfigContext.Provider value={value}> {children} </TestConfigContext.Provider>;
};

export const useTestConfig = () => {
  const [testConfig, setTestConfig] = useState<TestConfig>({});

  const setCurrentTestConfig = useCallback((currentTestConfig: TestConfig): void => {
    setTestConfig(currentTestConfig);
  }, []);

  return {
    testConfig,
    setCurrentTestConfig,
  };
};
