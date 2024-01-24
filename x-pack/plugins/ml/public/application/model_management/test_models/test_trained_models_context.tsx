/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, Dispatch, useContext } from 'react';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export interface TestTrainedModelsContextType {
  pipelineConfig?: estypes.IngestPipeline;
  createPipelineFlyoutOpen: boolean;
  defaultSelectedDataViewId?: string;
}
export const TestTrainedModelsContext = createContext<
  | {
      currentContext: TestTrainedModelsContextType;
      setCurrentContext: Dispatch<TestTrainedModelsContextType>;
    }
  | undefined
>(undefined);

export function useTestTrainedModelsContext() {
  const testTrainedModelsContext = useContext(TestTrainedModelsContext);

  if (testTrainedModelsContext === undefined) {
    throw new Error('TestTrainedModelsContext has not been initialized.');
  }

  return testTrainedModelsContext;
}
