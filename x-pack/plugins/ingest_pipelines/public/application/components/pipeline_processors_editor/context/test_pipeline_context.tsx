/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useContext, useReducer, Reducer } from 'react';
import { DeserializedProcessorResult } from '../deserialize';
import { Document } from '../types';

export interface TestPipelineData {
  config: {
    documents?: Document[];
    verbose?: boolean;
    selectedDocumentIndex: number;
  };
  testOutput?: {
    [key: string]: any;
  };
  testOutputByProcessor?: DeserializedProcessorResult[];
  isExecuting?: boolean;
}

type Action =
  | {
      type: 'updateOutputByProcessor';
      payload: {
        testOutputByProcessor?: DeserializedProcessorResult[];
        isExecuting: boolean;
      };
    }
  | {
      type: 'updateOutput';
      payload: {
        config: {
          documents: Document[];
          verbose?: boolean;
        };
        testOutput: {
          [key: string]: any;
        };
      };
    }
  | {
      type: 'updateActiveDocument';
      payload: Pick<TestPipelineData, 'config'>;
    }
  | {
      type: 'updateIsExecuting';
      payload: Pick<TestPipelineData, 'isExecuting'>;
    };

interface TestPipelineContext {
  testPipelineData: TestPipelineData;
  setCurrentTestPipelineData: (data: Action) => void;
}

const DEFAULT_TEST_PIPELINE_CONTEXT = {
  testPipelineData: {
    config: {
      selectedDocumentIndex: 0,
    },
    isExecuting: false,
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

export const reducer: Reducer<TestPipelineData, Action> = (state, action) => {
  if (action.type === 'updateOutputByProcessor') {
    return {
      ...state,
      testOutputByProcessor: action.payload.testOutputByProcessor,
      isExecuting: false,
    };
  }

  if (action.type === 'updateOutput') {
    return {
      ...action.payload,
      config: {
        ...action.payload.config,
        selectedDocumentIndex: state.config.selectedDocumentIndex,
      },
      testOutputByProcessor: state.testOutputByProcessor,
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

  if (action.type === 'updateIsExecuting') {
    return {
      ...state,
      isExecuting: action.payload.isExecuting,
    };
  }

  return state;
};

export const TestPipelineContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, DEFAULT_TEST_PIPELINE_CONTEXT.testPipelineData);

  const setCurrentTestPipelineData = useCallback((data: Action): void => {
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
