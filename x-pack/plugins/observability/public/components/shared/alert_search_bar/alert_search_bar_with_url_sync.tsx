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
import { AlertSearchBarWithUrlSyncProps } from './types';
import { useKibana } from '../../../utils/kibana_react';
import { ObservabilityAppServices } from '../../../application/types';
import { useToasts } from '../../../hooks/use_toast';

function AlertSearchbarWithUrlSync(props: AlertSearchBarWithUrlSyncProps) {
  const { urlStorageKey, ...searchBarProps } = props;
  const stateProps = useAlertSearchBarStateContainer(urlStorageKey);
  const {
    data: {
      query: {
        timefilter: { timefilter: timeFilterService },
      },
    },
    triggersActionsUi: { getAlertsSearchBar: AlertsSearchBar },
  } = useKibana<ObservabilityAppServices>().services;

  return (
    <ObservabilityAlertSearchBar
      {...stateProps}
      {...searchBarProps}
      services={{ timeFilterService, AlertsSearchBar, useToasts }}
    />
  );
}

export function ObservabilityAlertSearchbarWithUrlSync(props: AlertSearchBarWithUrlSyncProps) {
  return (
    <Provider value={alertSearchBarStateContainer}>
      <AlertSearchbarWithUrlSync {...props} />
    </Provider>
  );
}
