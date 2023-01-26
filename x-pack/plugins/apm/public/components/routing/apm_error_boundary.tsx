/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { NotFoundRouteException } from '@kbn/typed-react-router-config';
import { EuiErrorBoundary } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { NotFoundPrompt } from '@kbn/shared-ux-prompt-not-found';
import { ApmPluginStartDeps } from '../../plugin';

export class ApmErrorBoundary extends React.Component<
  { children?: React.ReactNode },
  { error?: Error },
  {}
> {
  public state: { error?: Error } = {
    error: undefined,
  };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <ErrorWithTemplate error={this.state.error} />;
    }

    return this.props.children;
  }
}

const pageHeader = {
  pageTitle: 'APM',
};

function ErrorWithTemplate({ error }: { error: Error }) {
  const { services } = useKibana<ApmPluginStartDeps>();
  const { observability } = services;

  const ObservabilityPageTemplate = observability.navigation.PageTemplate;

  if (error instanceof NotFoundRouteException) {
    return (
      <ObservabilityPageTemplate pageHeader={pageHeader}>
        <NotFoundPrompt />
      </ObservabilityPageTemplate>
    );
  }

  return (
    <ObservabilityPageTemplate pageHeader={pageHeader}>
      <EuiErrorBoundary>
        <DummyComponent error={error} />
      </EuiErrorBoundary>
    </ObservabilityPageTemplate>
  );
}

function DummyComponent({ error }: { error: Error }) {
  throw error;
  return <div />;
}
