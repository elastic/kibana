/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { QueryClient } from '@tanstack/react-query';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { CoreStart } from '@kbn/core/public';
import { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { RecursivePartial } from '@kbn/utility-types';
import { ObservabilityRuleTypeRegistry } from '@kbn/observability-plugin/public';
import { ExperimentalFeatures } from '../../../../common/config';
import { CreateSLOForm } from '../types';
import { PluginContext } from '../../../context/plugin_context';
import { SloPublicPluginsStart } from '../../../types';
import { SloAddFormFlyout } from './slo_form';

export const getCreateSLOFlyoutLazy = ({
  core,
  plugins,
  observabilityRuleTypeRegistry,
  ObservabilityPageTemplate,
  isDev,
  kibanaVersion,
  isServerless,
  experimentalFeatures,
}: {
  core: CoreStart;
  plugins: SloPublicPluginsStart;
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
  ObservabilityPageTemplate: React.ComponentType<LazyObservabilityPageTemplateProps>;
  isDev?: boolean;
  kibanaVersion: string;
  isServerless?: boolean;
  experimentalFeatures: ExperimentalFeatures;
}) => {
  return ({
    onClose,
    initialValues,
  }: {
    onClose: () => void;
    initialValues?: RecursivePartial<CreateSLOForm>;
  }) => {
    const queryClient = new QueryClient();
    return (
      <KibanaContextProvider
        services={{
          ...core,
          ...plugins,
          storage: new Storage(localStorage),
          isDev,
          kibanaVersion,
          isServerless,
        }}
      >
        <PluginContext.Provider
          value={{
            isDev,
            observabilityRuleTypeRegistry,
            ObservabilityPageTemplate,
            experimentalFeatures,
          }}
        >
          <QueryClientProvider client={queryClient}>
            <SloAddFormFlyout onClose={onClose} initialValues={initialValues} />
          </QueryClientProvider>
        </PluginContext.Provider>
      </KibanaContextProvider>
    );
  };
};
