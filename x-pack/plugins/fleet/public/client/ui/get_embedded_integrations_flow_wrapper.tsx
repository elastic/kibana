/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';

import type { UIExtensionsStorage } from '../..';
import type { FleetStartServices, FleetConfigType } from '../../plugin';

import type { EmbeddedIntegrationsFlowProps } from './components/embedded_integrations_flow';

const EmbeddedIntegrationsFlowLazy = lazy(async () => {
  const module = await import('./components/embedded_integrations_flow');

  return {
    default: module.EmbeddedIntegrationsFlow,
  };
});

export interface GetEmbeddedIntegrationsFlowProps {
  startServices: FleetStartServices;
  kibanaVersion: string;
  config: FleetConfigType;
  extensions: UIExtensionsStorage;
}

export interface EmbeddedIntegrationsFlowWrapperProps
  extends Omit<EmbeddedIntegrationsFlowProps, keyof GetEmbeddedIntegrationsFlowProps> {
  lazyFallback?: React.ReactNode;
}

export const getEmbeddedIntegrationsFlowWrapper =
  ({
    startServices,
    kibanaVersion,
    config,
    extensions,
  }: GetEmbeddedIntegrationsFlowProps): FC<EmbeddedIntegrationsFlowWrapperProps> =>
  ({ lazyFallback, integrationName, onClose }) => {
    return (
      <Suspense fallback={lazyFallback || <EuiLoadingSpinner />}>
        <EmbeddedIntegrationsFlowLazy
          startServices={startServices}
          kibanaVersion={kibanaVersion}
          config={config}
          extensions={extensions}
          integrationName={integrationName}
          onClose={onClose}
        />
      </Suspense>
    );
  };
