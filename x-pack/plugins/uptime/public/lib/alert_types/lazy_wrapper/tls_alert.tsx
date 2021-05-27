/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { CoreStart } from 'kibana/public';
import { store } from '../../../state';
import { KibanaContextProvider } from '../../../../../../../src/plugins/kibana_react/public';
import { ClientPluginsStart } from '../../../apps/plugin';
import { AlertTls } from '../../../components/overview/alerts/alerts_containers/alert_tls';
import { kibanaService } from '../../../state/kibana_service';

interface Props {
  core: CoreStart;
  plugins: ClientPluginsStart;
  params: any;
}

// eslint-disable-next-line import/no-default-export
export default function TLSAlert({ core, plugins, params: _params }: Props) {
  kibanaService.core = core;
  return (
    <ReduxProvider store={store}>
      <KibanaContextProvider services={{ ...core, ...plugins }}>
        <AlertTls />
      </KibanaContextProvider>
    </ReduxProvider>
  );
}
