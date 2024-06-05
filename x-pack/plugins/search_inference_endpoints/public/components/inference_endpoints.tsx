/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import { TabularPage } from './all_inference_endpoints/tabular_page';
import { EmptyPromptPage } from './empty_prompt_page';

interface InferenceEndpointsProps {
  inferenceEndpoints: InferenceAPIConfigResponse[];
  setIsInferenceFlyoutVisible: (visible: boolean) => void;
  addEndpointLabel: string;
}

export const InferenceEndpoints: React.FC<InferenceEndpointsProps> = ({
  inferenceEndpoints,
  setIsInferenceFlyoutVisible,
  addEndpointLabel,
}) => {
  return inferenceEndpoints.length === 0 ? (
    <EmptyPromptPage
      addEndpointLabel={addEndpointLabel}
      setIsInferenceFlyoutVisible={setIsInferenceFlyoutVisible}
    />
  ) : (
    <TabularPage inferenceEndpoints={inferenceEndpoints} />
  );
};
