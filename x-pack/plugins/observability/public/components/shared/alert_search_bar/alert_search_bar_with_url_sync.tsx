/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { alertsPageStateContainer, Provider } from './containers';
import { AlertSearchBar, AlertSearchBarProps } from './alert_search_bar';

export function AlertSearchbarWithUrlSync(props: AlertSearchBarProps) {
  return (
    <Provider value={alertsPageStateContainer}>
      <AlertSearchBar {...props} />
    </Provider>
  );
}
