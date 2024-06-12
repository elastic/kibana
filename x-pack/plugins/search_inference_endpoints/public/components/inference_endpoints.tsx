/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { EuiPageTemplate } from '@elastic/eui';

import { useQueryInferenceEndpoints } from '../hooks/use_inference_endpoints';
import { TabularPage } from './all_inference_endpoints/tabular_page';
import { EmptyPromptPage } from './empty_prompt_page';
import { InferenceEndpointsHeader } from './inference_endpoints_header';
import { InferenceFlyoutWrapperComponent } from './inference_flyout_wrapper_component';

export const InferenceEndpoints: React.FC = () => {
  const { inferenceEndpoints } = useQueryInferenceEndpoints();
  const [isInferenceFlyoutVisible, setIsInferenceFlyoutVisible] = useState<boolean>(false);

  return (
    <>
      {inferenceEndpoints.length > 0 && (
        <InferenceEndpointsHeader setIsInferenceFlyoutVisible={setIsInferenceFlyoutVisible} />
      )}
      <EuiPageTemplate.Section className="eui-yScroll">
        {inferenceEndpoints.length === 0 ? (
          <EmptyPromptPage setIsInferenceFlyoutVisible={setIsInferenceFlyoutVisible} />
        ) : (
          <TabularPage inferenceEndpoints={inferenceEndpoints} />
        )}
      </EuiPageTemplate.Section>
      {isInferenceFlyoutVisible && (
        <InferenceFlyoutWrapperComponent
          isInferenceFlyoutVisible={isInferenceFlyoutVisible}
          setIsInferenceFlyoutVisible={setIsInferenceFlyoutVisible}
          inferenceEndpoints={inferenceEndpoints}
        />
      )}
    </>
  );
};
