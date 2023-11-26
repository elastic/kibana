/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { AlertsSearchBar as AlertsSearchBarShared } from '@kbn/alerts-ui-shared';
import { AlertsSearchBarProps } from './types';
import { TriggersAndActionsUiServices } from '../../..';

export function AlertsSearchBar(props: AlertsSearchBarProps) {
  const {
    http,
    notifications: { toasts },
    data: dataService,
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useKibana<TriggersAndActionsUiServices>().services;

  return (
    <AlertsSearchBarShared
      {...props}
      http={http}
      toasts={toasts}
      unifiedSearchBar={SearchBar}
      dataViewsService={dataService.dataViews}
    />
  );
}

// eslint-disable-next-line import/no-default-export
export { AlertsSearchBar as default };
