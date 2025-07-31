/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { EuiLoadingSpinner, EuiEmptyPrompt, EuiText } from '@elastic/eui';
import { useDataSourceUIConfig } from '../hooks/use_data_sources';
import { componentRegistry } from '../services/component_registry';

export const DataSourceConfigPage: React.FC = () => {
  const { type } = useParams<{ type: string }>();
  const { data: uiConfig, isLoading, error } = useDataSourceUIConfig(type);

  if (isLoading) {
    return <EuiLoadingSpinner size="xl" />;
  }

  if (error) {
    return (
      <EuiEmptyPrompt
        title={<h2>Error loading data source configuration</h2>}
        body={
          <EuiText>
            <p>Unable to load configuration UI for data source type: {type}</p>
            <p>Error: {error instanceof Error ? error.message : 'Unknown error'}</p>
          </EuiText>
        }
      />
    );
  }

  if (!uiConfig?.componentPath) {
    return (
      <EuiEmptyPrompt
        title={<h2>No custom UI available</h2>}
        body={
          <EuiText>
            <p>Data source type "{type}" does not have a custom configuration UI.</p>
          </EuiText>
        }
      />
    );
  }

  // Try to resolve the component from the registry
  const componentEntry = componentRegistry.get(uiConfig.componentPath);

  if (!componentEntry) {
    return (
      <EuiEmptyPrompt
        title={<h2>Component not found</h2>}
        body={
          <EuiText>
            <p>Component for path "{uiConfig.componentPath}" is not registered.</p>
            <p>Available components: {componentRegistry.getAll().join(', ')}</p>
          </EuiText>
        }
      />
    );
  }

  // Render the resolved component with props
  const Component = componentEntry.component;
  const componentProps = {
    ...uiConfig.componentProps,
    // Always include the type for reference
    type,
  };

  return <Component {...componentProps} />;
};
