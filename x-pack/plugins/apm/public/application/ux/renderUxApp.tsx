/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Suspense } from 'react';
import { AppMountParameters, CoreStart } from 'kibana/public';
import ReactDOM from 'react-dom';
import { EuiLoadingSpinner } from '@elastic/eui';
import { ApmPluginSetupDeps, ApmPluginStartDeps } from '../../plugin';
import { ConfigSchema } from '../../index';

const UxAppRoot = React.lazy(() => import('./uxApp')); // Lazy-loaded

/**
 * This module is rendered asynchronously in the Kibana platform.
 */

const CENTER_STYLE = {
  textAlign: 'center',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  position: 'fixed',
};
export const renderUxApp = (
  core: CoreStart,
  deps: ApmPluginSetupDeps,
  { element, history }: AppMountParameters,
  config: ConfigSchema,
  corePlugins: ApmPluginStartDeps
) => {
  ReactDOM.render(
    <Suspense
      fallback={
        <div style={CENTER_STYLE}>
          <EuiLoadingSpinner size="xl" />
        </div>
      }
    >
      <UxAppRoot
        core={core}
        deps={deps}
        history={history}
        config={config}
        corePlugins={corePlugins}
      />
    </Suspense>,
    element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
