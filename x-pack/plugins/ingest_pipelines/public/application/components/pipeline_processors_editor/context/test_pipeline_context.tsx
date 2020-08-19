/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useContext, useReducer, Reducer } from 'react';
import { useKibana } from '../../../../shared_imports';
import {
  DeserializedProcessorResult,
  deserializeVerboseTestOutput,
  DeserializeResult,
} from '../deserialize';
import { serialize } from '../serialize';
import { Document } from '../types';

export interface TestPipelineData {
  config: {
    documents?: Document[];
    verbose?: boolean;
    selectedDocumentIndex: number;
  };
  testOutputPerProcessor?: DeserializedProcessorResult[];
  isExecutingPipeline?: boolean;
}

type Action =
  | {
      type: 'updateOutputPerProcessor';
      payload: {
        testOutputPerProcessor?: DeserializedProcessorResult[];
        isExecutingPipeline: boolean;
      };
    }
  | {
      type: 'updateConfig';
      payload: {
        config: {
          documents: Document[];
          verbose?: boolean;
        };
      };
    }
  | {
      type: 'updateActiveDocument';
      payload: Pick<TestPipelineData, 'config'>;
    }
  | {
      type: 'updateIsExecutingPipeline';
      payload: Pick<TestPipelineData, 'isExecutingPipeline'>;
    };

export interface TestPipelineContext {
  testPipelineData: TestPipelineData;
  setCurrentTestPipelineData: (data: Action) => void;
  updateTestOutputPerProcessor: (
    documents: Document[] | undefined,
    processors: DeserializeResult
  ) => void;
}

const DEFAULT_TEST_PIPELINE_CONTEXT = {
  testPipelineData: {
    config: {
      selectedDocumentIndex: 0,
    },
    isExecutingPipeline: false,
  },
  setCurrentTestPipelineData: () => {},
  updateTestOutputPerProcessor: () => {},
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
  if (action.type === 'updateOutputPerProcessor') {
    return {
      ...state,
      testOutputPerProcessor: action.payload.testOutputPerProcessor,
      isExecutingPipeline: false,
    };
  }

  if (action.type === 'updateConfig') {
    return {
      ...action.payload,
      config: {
        ...action.payload.config,
        selectedDocumentIndex: state.config.selectedDocumentIndex,
      },
      testOutputPerProcessor: state.testOutputPerProcessor,
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

  if (action.type === 'updateIsExecutingPipeline') {
    return {
      ...state,
      isExecutingPipeline: action.payload.isExecutingPipeline,
    };
  }

  return state;
};

export const TestPipelineContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, DEFAULT_TEST_PIPELINE_CONTEXT.testPipelineData);
  const { services } = useKibana();

  const updateTestOutputPerProcessor = useCallback(
    async (documents: Document[] | undefined, processors: DeserializeResult) => {
      if (!documents) {
        return;
      }

      dispatch({
        type: 'updateIsExecutingPipeline',
        payload: {
          isExecutingPipeline: true,
        },
      });

      const serializedProcessorsWithTag = serialize({
        pipeline: { processors: processors.processors, onFailure: processors.onFailure },
        copyIdToTag: true,
      });

      const { data: verboseResults, error } = await services.api.simulatePipeline({
        documents,
        verbose: true,
        pipeline: { ...serializedProcessorsWithTag },
      });

      if (error) {
        dispatch({
          type: 'updateOutputPerProcessor',
          payload: {
            isExecutingPipeline: false,
            // reset the output if there is an error
            // this will result to the status changing to "inactive"
            testOutputPerProcessor: undefined,
          },
        });

        return;
      }

      dispatch({
        type: 'updateOutputPerProcessor',
        payload: {
          testOutputPerProcessor: deserializeVerboseTestOutput(verboseResults),
          isExecutingPipeline: false,
        },
      });
    },
    [services.api]
  );

  return (
    <TestPipelineContext.Provider
      value={{
        testPipelineData: state,
        setCurrentTestPipelineData: dispatch,
        updateTestOutputPerProcessor,
      }}
    >
      {children}
    </TestPipelineContext.Provider>
  );
};
