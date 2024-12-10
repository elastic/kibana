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
import { InferenceEndpointsHeader } from './inference_endpoints_header';

export const InferenceEndpoints: React.FC = () => {
  const { data } = useQueryInferenceEndpoints();

  const inferenceEndpoints = data || [];

  return (
    <>
      <InferenceEndpointsHeader />
      <EuiPageTemplate.Section className="eui-yScroll" data-test-subj="inferenceManagementPage">
        <TabularPage inferenceEndpoints={inferenceEndpoints} />
      </EuiPageTemplate.Section>
    </>
  );
};
