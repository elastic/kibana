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
import { AppMountParameters, CoreStart } from '../../../../../src/core/public';
import { ApmPluginSetupDeps, ApmPluginStartDeps } from '../plugin';
import { createCallApmApi } from '../services/rest/createCallApmApi';
import { createStaticIndexPattern } from '../services/rest/index_pattern';
import { setHelpExtension } from '../setHelpExtension';
import { setReadonlyBadge } from '../updateBadge';
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
  const { element } = appMountParameters;
  const apmPluginContextValue = {
    appMountParameters,
    config,
    core: coreStart,
    plugins: pluginsSetup,
    observability: pluginsStart.observability,
    observabilityRuleTypeRegistry,
  };

  // render APM feedback link in global help menu
  setHelpExtension(coreStart);
  setReadonlyBadge(coreStart);
  createCallApmApi(coreStart);

  // Automatically creates static index pattern and stores as saved object
  createStaticIndexPattern().catch((e) => {
    // eslint-disable-next-line no-console
    console.log('Error creating static index pattern', e);
  });

  ReactDOM.render(
    <ApmAppRoot
      apmPluginContextValue={apmPluginContextValue}
      pluginsStart={pluginsStart}
    />,
    element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
