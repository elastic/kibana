/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import 'react-vis/dist/style.css';
import type { ObservabilityRuleTypeRegistry } from '@kbn/observability-plugin/public';
import {
  AppMountParameters,
  CoreStart,
  APP_WRAPPER_CLASS,
} from '@kbn/core/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { ConfigSchema } from '..';
import { ApmPluginSetupDeps, ApmPluginStartDeps } from '../plugin';
import { createCallApmApi } from '../services/rest/create_call_apm_api';
import { setHelpExtension } from '../set_help_extension';
import { setReadonlyBadge } from '../update_badge';
import { ApmAppRoot } from '../components/routing/app_root';

/**
 * This module is rendered asynchronously in the Kibana platform.
 */

export const renderApp = ({
  coreStart,
  pluginsSetup,
  appMountParameters,
  config,
  pluginsStart,
  observabilityRuleTypeRegistry,
}: {
  coreStart: CoreStart;
  pluginsSetup: ApmPluginSetupDeps;
  appMountParameters: AppMountParameters;
  config: ConfigSchema;
  pluginsStart: ApmPluginStartDeps;
  observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
}) => {
  const { element, theme$ } = appMountParameters;
  const apmPluginContextValue = {
    appMountParameters,
    config,
    core: coreStart,
    plugins: pluginsSetup,
    data: pluginsStart.data,
    inspector: pluginsStart.inspector,
    observability: pluginsStart.observability,
    observabilityRuleTypeRegistry,
    dataViews: pluginsStart.dataViews,
    unifiedSearch: pluginsStart.unifiedSearch,
  };

  // render APM feedback link in global help menu
  setHelpExtension(coreStart);
  setReadonlyBadge(coreStart);
  createCallApmApi(coreStart);

  // add .kbnAppWrappers class to root element
  element.classList.add(APP_WRAPPER_CLASS);

  ReactDOM.render(
    <KibanaThemeProvider
      theme$={theme$}
      modify={{
        breakpoint: {
          xxl: 1600,
          xxxl: 2000,
        },
      }}
    >
      <ApmAppRoot
        apmPluginContextValue={apmPluginContextValue}
        pluginsStart={pluginsStart}
      />
    </KibanaThemeProvider>,
    element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
