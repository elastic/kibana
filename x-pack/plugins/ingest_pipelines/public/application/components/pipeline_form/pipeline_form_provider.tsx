/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { PipelineForm, PipelineFormProps } from './pipeline_form';
import { TestConfigContextProvider, useTestConfig } from './test_config_context';

export const PipelineFormProvider: React.FunctionComponent<PipelineFormProps> = passThroughProps => {
  const testConfigContextValue = useTestConfig();

  return (
    <TestConfigContextProvider value={testConfigContextValue}>
      <PipelineForm {...passThroughProps} />
    </TestConfigContextProvider>
  );
};
