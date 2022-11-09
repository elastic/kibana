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
import { AlertSearchBar } from './alert_search_bar';
import { AlertSearchBarWithUrlSyncProps } from './types';

function InternalAlertSearchbarWithUrlSync(props: AlertSearchBarWithUrlSyncProps) {
  const stateProps = useAlertSearchBarStateContainer();

  return <AlertSearchBar {...props} {...stateProps} />;
}

export function AlertSearchbarWithUrlSync(props: AlertSearchBarWithUrlSyncProps) {
  return (
    <Provider value={alertSearchBarStateContainer}>
      <InternalAlertSearchbarWithUrlSync {...props} />
    </Provider>
  );
}
