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
import { useLocation } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { ProfilingPluginPublicStartDeps } from '../types';

export function RouterErrorBoundary({ children }: { children?: React.ReactNode }) {
  const location = useLocation();
  return <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>;
}

class ErrorBoundary extends React.Component<{ children?: React.ReactNode }, { error?: Error }, {}> {
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
  pageTitle: i18n.translate('xpack.profiling.universalProfiling', {
    defaultMessage: 'Universal Profiling',
  }),
};

function ErrorWithTemplate({ error }: { error: Error }) {
  const { services } = useKibana<ProfilingPluginPublicStartDeps>();
  const { observabilityShared } = services;

  const ObservabilityPageTemplate = observabilityShared.navigation.PageTemplate;

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
