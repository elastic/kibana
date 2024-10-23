/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';

import { BehaviorSubject } from 'rxjs';
import { EntityManagerPublicPluginSetup } from '@kbn/entityManager-plugin/public';
import {
  type ITelemetryClient,
  TelemetryEventTypes,
  type InventoryAddDataParams,
  type EntityInventoryViewedParams,
  type EntityInventorySearchQuerySubmittedParams,
  type EntityViewClickedParams,
  type EntityInventoryEntityTypeFilteredParams,
} from './types';

export class TelemetryClient implements ITelemetryClient {
  private eemEnabled$: BehaviorSubject<{ eem_enabled: boolean }>;

  constructor(
    private analytics: AnalyticsServiceSetup,
    private entityManager: EntityManagerPublicPluginSetup
  ) {
    this.eemEnabled$ = new BehaviorSubject<{ eem_enabled: boolean }>({ eem_enabled: false });
  }

  public initialize = () => {
    this.entityManager.entityClient.isManagedEntityDiscoveryEnabled().then(({ enabled }) => {
      this.updateEemEnabled(enabled);

      this.analytics.registerContextProvider({
        name: 'eem_enabled',
        context$: this.eemEnabled$,
        schema: {
          eem_enabled: {
            type: 'boolean',
            _meta: { description: 'Whether EEM is enabled or not.' },
          },
        },
      });
    });
  };

  public updateEemEnabled = (enabled: boolean) => {
    this.eemEnabled$.next({ eem_enabled: enabled });
  };

  public reportInventoryAddData = (params: InventoryAddDataParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.INVENTORY_ADD_DATA_CLICKED, params);
  };

  public reportEntityInventoryViewed = (params: EntityInventoryViewedParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.ENTITY_INVENTORY_VIEWED, params);
  };

  public reportEntityInventorySearchQuerySubmitted = (
    params: EntityInventorySearchQuerySubmittedParams
  ) => {
    this.analytics.reportEvent(TelemetryEventTypes.ENTITY_INVENTORY_SEARCH_QUERY_SUBMITTED, params);
  };

  public reportEntityInventoryEntityTypeFiltered = (
    params: EntityInventoryEntityTypeFilteredParams
  ) => {
    this.analytics.reportEvent(TelemetryEventTypes.ENTITY_INVENTORY_ENTITY_TYPE_FILTERED, params);
  };

  public reportEntityViewClicked = (params: EntityViewClickedParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.ENTITY_VIEW_CLICKED, params);
  };
}
