/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { CoreRequestHandlerContext, KibanaRequest } from '@kbn/core/server';
import { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';

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

type AlertDetailsContextHandlerQuery = t.TypeOf<typeof observabilityAlertDetailsContextRt>;
export interface AlertDetailsRequestContext {
  request: KibanaRequest;
  core: Promise<CoreRequestHandlerContext>;
  licensing: Promise<LicensingApiRequestHandlerContext>;
}
type AlertDetailsContextHandler = (
  context: AlertDetailsRequestContext,
  query: AlertDetailsContextHandlerQuery
) => Promise<string>;

export class AlertDetailsContextService {
  private handlers: AlertDetailsContextHandler[] = [];

  constructor() {}

  registerHandler(handler: AlertDetailsContextHandler) {
    this.handlers.push(handler);
  }

  getAlertDetailsContext(
    context: AlertDetailsRequestContext,
    query: AlertDetailsContextHandlerQuery
  ): Promise<string> {
    return Promise.all(this.handlers.map((handler) => handler(context, query))).then(
      (results: string[]) => results.join('\n')
    );
  }
}
