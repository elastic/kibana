/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnalyticsServiceSetup } from '@kbn/core/public';
import { BehaviorSubject } from 'rxjs';
import {
  serviceInventoryStorageKey,
  ServiceInventoryView,
} from '../context/entity_manager_context/entity_manager_context';

export const serviceInventoryViewType$ = new BehaviorSubject({
  serviceInventoryViewType: JSON.parse(
    window.localStorage.getItem(serviceInventoryStorageKey) || ServiceInventoryView.classic
  ),
});

export function registerServiceInventoryViewTypeContext(analytics: AnalyticsServiceSetup) {
  analytics.registerContextProvider({
    name: 'serviceInventoryViewType',
    context$: serviceInventoryViewType$,
    schema: {
      serviceInventoryViewType: {
        type: 'keyword',
        _meta: { description: 'The APM service inventory view type' },
      },
    },
  });
}
