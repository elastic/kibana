/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiPageTemplate } from '@elastic/eui';

import { useQueryInferenceEndpoints } from '../hooks/use_inference_endpoints';
import { TabularPage } from './all_inference_endpoints/tabular_page';
import { AddEmptyPrompt } from './empty_prompt/add_empty_prompt';
import { InferenceEndpointsHeader } from './inference_endpoints_header';

export const InferenceEndpoints: React.FC = () => {
  const { inferenceEndpoints } = useQueryInferenceEndpoints();

  return (
    <>
      {inferenceEndpoints.length > 0 && <InferenceEndpointsHeader />}
      <EuiPageTemplate.Section className="eui-yScroll">
        {inferenceEndpoints.length === 0 ? (
          <AddEmptyPrompt />
        ) : (
          <TabularPage inferenceEndpoints={inferenceEndpoints} />
        )}
      </EuiPageTemplate.Section>
    </>
  );
};
