/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import {
  IScopedClusterClient,
  IUiSettingsClient,
  KibanaRequest,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';
import { concat } from 'lodash';

export const observabilityAlertDetailsContextRt = t.intersection([
  t.type({
    alert_started_at: t.string,
  }),
  t.partial({
    // apm fields
    'service.name': t.string,
    'service.environment': t.string,
    'transaction.type': t.string,
    'transaction.name': t.string,

    // infrastructure fields
    'host.name': t.string,
    'container.id': t.string,
    'kubernetes.pod.name': t.string,
  }),
]);

export type AlertDetailsContextualInsightsHandlerQuery = t.TypeOf<
  typeof observabilityAlertDetailsContextRt
>;

export interface AlertDetailsContextualInsight {
  key: string;
  description: string;
  data: unknown;
}

export interface AlertDetailsContextualInsightsRequestContext {
  request: KibanaRequest;
  core: Promise<{
    elasticsearch: {
      client: IScopedClusterClient;
    };
    uiSettings: {
      client: IUiSettingsClient;
      globalClient: IUiSettingsClient;
    };
    savedObjects: {
      client: SavedObjectsClientContract;
    };
  }>;
  licensing: Promise<LicensingApiRequestHandlerContext>;
}
type AlertDetailsContextualInsightsHandler = (
  context: AlertDetailsContextualInsightsRequestContext,
  query: AlertDetailsContextualInsightsHandlerQuery
) => Promise<AlertDetailsContextualInsight[]>;

export class AlertDetailsContextualInsightsService {
  private handlers: AlertDetailsContextualInsightsHandler[] = [];

  constructor() {}

  registerHandler(handler: AlertDetailsContextualInsightsHandler) {
    this.handlers.push(handler);
  }

  getAlertDetailsContext(
    context: AlertDetailsContextualInsightsRequestContext,
    query: AlertDetailsContextualInsightsHandlerQuery
  ): Promise<AlertDetailsContextualInsight[]> {
    return Promise.all(this.handlers.map((handler) => handler(context, query))).then((results) => {
      const [head, ...rest] = results;
      return concat(head, ...rest);
    });
  }
}
