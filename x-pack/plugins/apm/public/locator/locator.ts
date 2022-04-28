/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRight } from 'fp-ts/Either';
import * as t from 'io-ts';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { IUiSettingsClient } from '@kbn/core/public';
import { LocatorDefinition } from '@kbn/share-plugin/common';
import { environmentRt } from '../../common/environment_rt';

const apmRouteConfigModule = import('../components/routing/apm_route_config');

export const APM_APP_LOCATOR_ID = 'APM_LOCATOR';

const APMLocatorPayloadValidator = t.intersection([
  t.type({
    serviceName: t.string,
  }),
  t.partial({
    serviceOverviewTab: t.keyof({
      traces: null,
      metrics: null,
      logs: null,
    }),
  }),
  t.type({
    query: environmentRt,
  }),
]);

export type APMLocatorPayload = t.TypeOf<typeof APMLocatorPayloadValidator>;

export class APMLocatorDefinition
  implements LocatorDefinition<APMLocatorPayload>
{
  id = APM_APP_LOCATOR_ID;
  uiSettings: IUiSettingsClient;

  constructor(uiSettings: IUiSettingsClient) {
    this.uiSettings = uiSettings;
  }

  async getLocation(payload: APMLocatorPayload) {
    const { apmRouter } = await apmRouteConfigModule;

    const decodedPayload = APMLocatorPayloadValidator.decode(payload);
    if (!isRight(decodedPayload)) {
      throw new Error(PathReporter.report(decodedPayload).join('\n'));
    }

    const mapObj = {
      logs: '/services/{serviceName}/logs',
      metrics: '/services/{serviceName}/metrics',
      traces: '/services/{serviceName}/transactions',
      default: '/services/{serviceName}/overview',
    } as const;

    const apmPath = mapObj[payload.serviceOverviewTab || 'default'];
    const { from: rangeFrom, to: rangeTo } = this.uiSettings.get(
      'timepicker:timeDefaults'
    );
    const defaultQueryParams = {
      kuery: '',
      serviceGroup: '',
      comparisonEnabled: false,
      rangeFrom,
      rangeTo,
    };
    const path = apmRouter.link(apmPath, {
      path: { serviceName: payload.serviceName },
      query: {
        ...defaultQueryParams,
        ...payload.query,
      },
    });

    return {
      app: 'apm',
      path,
      state: {},
    };
  }
}
