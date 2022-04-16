/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { store } from '../../../state';
import { AnomalyAlertComponent } from '../../../components/overview/alerts/anomaly_alert/anomaly_alert';
import { ClientPluginsStart } from '../../../apps/plugin';
import { kibanaService } from '../../../state/kibana_service';

interface Props {
  core: CoreStart;
  plugins: ClientPluginsStart;
  params: any;
}

// eslint-disable-next-line import/no-default-export
export default function DurationAnomalyAlert({ core, plugins, params }: Props) {
  kibanaService.core = core;
  return (
    <ReduxProvider store={store}>
      <KibanaContextProvider services={{ ...core, ...plugins }}>
        <AnomalyAlertComponent {...params} />
      </KibanaContextProvider>
    </ReduxProvider>
  );
}
