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
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { RecursivePartial } from '@kbn/utility-types';
import { CreateSLOForm } from '../types';
import { PluginContext } from '../../../context/plugin_context/plugin_context';
import { ObservabilityRuleTypeRegistry } from '../../..';
import { ObservabilityPublicPluginsStart, ConfigSchema } from '../../../plugin';
import { SloAddFormFlyout } from './slo_form';

export const getCreateSLOFlyoutLazy = ({
  core,
  config,
  plugins,
  observabilityRuleTypeRegistry,
  ObservabilityPageTemplate,
  isDev,
  kibanaVersion,
  isServerless,
}: {
  core: CoreStart;
  config: ConfigSchema;
  plugins: ObservabilityPublicPluginsStart;
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
  ObservabilityPageTemplate: React.ComponentType<LazyObservabilityPageTemplateProps>;
  isDev?: boolean;
  kibanaVersion: string;
  isServerless?: boolean;
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
            config,
            observabilityRuleTypeRegistry,
            ObservabilityPageTemplate,
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
