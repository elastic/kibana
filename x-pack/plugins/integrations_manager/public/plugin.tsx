/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { CoreSetup, CoreStart, I18nStart } from 'src/core/public';
import { HashRouter, Switch } from 'react-router-dom';
import { EuiPage } from '@elastic/eui';
import { routes } from './routes';

export type PluginSetup = ReturnType<Plugin['setup']>;
export type PluginStart = ReturnType<Plugin['start']>;

export class Plugin {
  // called when plugin is setting up during Kibana's startup sequence
  public setup(core: CoreSetup) {}
  // called after all plugins are set up
  public start(core: CoreStart) {
    const { i18n } = core;

    return {
      root: <Root i18n={i18n} />,
    };
  }
}

interface RootProps {
  i18n: I18nStart;
}

function Root(props: RootProps) {
  const { i18n } = props;

  return (
    <i18n.Context>
      <HashRouter>
        <EuiPage style={{ flexWrap: 'wrap' }}>
          <Switch>{routes}</Switch>
        </EuiPage>
      </HashRouter>
    </i18n.Context>
  );
}
