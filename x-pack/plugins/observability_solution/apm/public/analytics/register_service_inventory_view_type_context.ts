/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnalyticsServiceSetup } from '@kbn/core/public';
import { BehaviorSubject } from 'rxjs';
import { ServiceInventoryView } from '../context/entity_manager_context/entity_manager_context';

export const SERVICE_INVENTORY_STORAGE_KEY = 'apm.service.inventory.view';

export let serviceInventoryViewType$: BehaviorSubject<{ serviceInventoryViewType: string }>;

export function registerServiceInventoryViewTypeContext(analytics: AnalyticsServiceSetup) {
  const serviceInventoryLocalStorageValue = window.localStorage.getItem(
    SERVICE_INVENTORY_STORAGE_KEY
  );
  serviceInventoryViewType$ = new BehaviorSubject({
    serviceInventoryViewType:
      serviceInventoryLocalStorageValue === null
        ? ServiceInventoryView.classic
        : JSON.parse(serviceInventoryLocalStorageValue),
  });
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
