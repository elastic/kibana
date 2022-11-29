/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  alertSearchBarStateContainer,
  Provider,
  useAlertSearchBarStateContainer,
} from './containers';
import { ObservabilityAlertSearchBar } from './alert_search_bar';
import { ObservabilityAlertSearchBarProvider } from './services';
import { AlertSearchBarWithUrlSyncProps } from './types';
import { useKibana } from '../../../utils/kibana_react';
import { ObservabilityAppServices } from '../../../application/types';

function AlertSearchbarWithUrlSync(props: AlertSearchBarWithUrlSyncProps) {
  const { urlStorageKey, ...searchBarProps } = props;
  const stateProps = useAlertSearchBarStateContainer(urlStorageKey);
  const services = useKibana<ObservabilityAppServices>().services;

  return (
    <ObservabilityAlertSearchBarProvider {...services}>
      <ObservabilityAlertSearchBar {...stateProps} {...searchBarProps} />
    </ObservabilityAlertSearchBarProvider>
  );
}

export function ObservabilityAlertSearchbarWithUrlSync(props: AlertSearchBarWithUrlSyncProps) {
  return (
    <Provider value={alertSearchBarStateContainer}>
      <AlertSearchbarWithUrlSync {...props} />
    </Provider>
  );
}
