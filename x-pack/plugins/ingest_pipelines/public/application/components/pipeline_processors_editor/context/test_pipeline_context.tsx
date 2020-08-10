/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useContext, useReducer } from 'react';

// TODO need to update code to reflect new data structure
export interface TestPipelineData {
  config: {
    documents?: object[];
    verbose?: boolean;
    selectedDocumentIndex: number;
  };
  results?: any; // todo fix TS
  resultsByProcessor?: any; // todo fix TS
}

interface TestPipelineContext {
  testPipelineData: TestPipelineData;
  setCurrentTestPipelineData: (data: TestPipelineData) => void;
}

const DEFAULT_TEST_PIPELINE_CONTEXT = {
  testPipelineData: {
    config: {
      selectedDocumentIndex: 0,
    },
  },
  setCurrentTestPipelineData: () => {},
};

const TestPipelineContext = React.createContext<TestPipelineContext>(DEFAULT_TEST_PIPELINE_CONTEXT);

export const useTestPipelineContext = () => {
  const ctx = useContext(TestPipelineContext);
  if (!ctx) {
    throw new Error(
      '"useTestPipelineContext" can only be called inside of TestPipelineContextProvider.Provider!'
    );
  }
  return ctx;
};

function reducer(state, action) {
  if (action.type === 'updateResultsByProcessor') {
    return {
      ...action.payload,
      config: {
        ...action.payload.config,
        selectedDocumentIndex: state.config.selectedDocumentIndex,
      },
    };
  }

  if (action.type === 'updateResults') {
    return {
      ...action.payload,
      config: {
        ...action.payload.config,
        selectedDocumentIndex: state.config.selectedDocumentIndex,
      },
      resultsByProcessor: state.resultsByProcessor,
    };
  }

  if (action.type === 'updateActiveDocument') {
    return {
      ...state,
      config: {
        ...state.config,
        selectedDocumentIndex: action.payload.config.selectedDocumentIndex,
      },
    };
  }

  return state;
}

export const TestPipelineContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, DEFAULT_TEST_PIPELINE_CONTEXT.testPipelineData);

  const setCurrentTestPipelineData = useCallback((data: object): void => {
    dispatch(data);
  }, []);

  return (
    <TestPipelineContext.Provider
      value={{
        testPipelineData: state,
        setCurrentTestPipelineData,
      }}
    >
      {children}
    </TestPipelineContext.Provider>
  );
};
