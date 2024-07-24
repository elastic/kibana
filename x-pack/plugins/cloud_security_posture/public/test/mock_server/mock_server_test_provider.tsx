/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { CoreStart } from '@kbn/core/public';
import { CspClientPluginStartDeps } from '../../types';
import { TestProvider } from '../test_provider';
import { getMockServerDependencies } from './mock_server';
interface MockServerDependencies {
  deps: Partial<CspClientPluginStartDeps>;
  core: CoreStart;
}

interface MockServerTestProviderProps {
  children: React.ReactNode;
  dependencies?: MockServerDependencies;
}

/**
 * Simple wrapper around the TestProvider that provides dependencies for the mock server.
 */
export const MockServerTestProvider = ({
  children,
  dependencies = getMockServerDependencies(),
}: MockServerTestProviderProps) => {
  return <TestProvider {...dependencies}>{children}</TestProvider>;
};

/**
 * Renders a component wrapped in the MockServerTestProvider.
 */
export const renderWrapper = (children: React.ReactNode, dependencies?: MockServerDependencies) => {
  return render(
    <MockServerTestProvider dependencies={dependencies}>{children}</MockServerTestProvider>
  );
};
