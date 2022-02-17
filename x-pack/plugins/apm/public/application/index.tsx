/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import 'react-vis/dist/style.css';
import type { ObservabilityRuleTypeRegistry } from '../../../observability/public';
import { ConfigSchema } from '../';
import {
  AppMountParameters,
  CoreStart,
  APP_WRAPPER_CLASS,
} from '../../../../../src/core/public';
import { ApmPluginSetupDeps, ApmPluginStartDeps } from '../plugin';
import { createCallApmApi } from '../services/rest/create_call_apm_api';
import { createStaticDataView } from '../services/rest/data_view';
import { setHelpExtension } from '../set_help_extension';
import { setReadonlyBadge } from '../update_badge';
import { ApmAppRoot } from '../components/routing/app_root';
import { KibanaThemeProvider } from '../../../../../src/plugins/kibana_react/public';

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
  };

  // render APM feedback link in global help menu
  setHelpExtension(coreStart);
  setReadonlyBadge(coreStart);
  createCallApmApi(coreStart);

  // Automatically creates static data view and stores as saved object
  createStaticDataView().catch((e) => {
    // eslint-disable-next-line no-console
    console.log('Error creating static data view', e);
  });

  // add .kbnAppWrappers class to root element
  element.classList.add(APP_WRAPPER_CLASS);

  ReactDOM.render(
    <KibanaThemeProvider theme$={theme$}>
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
