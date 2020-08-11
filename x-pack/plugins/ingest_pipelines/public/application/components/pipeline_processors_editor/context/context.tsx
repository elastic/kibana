/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';

import {
  PipelineProcessorsContextProvider,
  Props as ProcessorsContextProps,
} from './processors_context';
import { TestConfigContextProvider } from './test_config_context';

interface Props extends ProcessorsContextProps {
  children: React.ReactNode;
}

export const ProcessorsEditorContextProvider: FunctionComponent<Props> = ({
  children,
  links,
  api,
  toasts,
  onUpdate,
  value,
  onFlyoutOpen,
}: Props) => {
  return (
    <TestConfigContextProvider>
      <PipelineProcessorsContextProvider
        onFlyoutOpen={onFlyoutOpen}
        links={links}
        api={api}
        toasts={toasts}
        onUpdate={onUpdate}
        value={value}
      >
        {children}
      </PipelineProcessorsContextProvider>
    </TestConfigContextProvider>
  );
};
