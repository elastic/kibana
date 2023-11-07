/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, Dispatch } from 'react';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export interface TestTrainedModelsContextType {
  pipelineConfig: estypes.IngestPipeline | undefined;
  createPipelineFlyoutOpen: boolean;
}
export const TestTrainedModelsContext = createContext<
  | {
      currentContext: TestTrainedModelsContextType;
      setCurrentContext: Dispatch<TestTrainedModelsContextType>;
    }
  | undefined
>(undefined);
