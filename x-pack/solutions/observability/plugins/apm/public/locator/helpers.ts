/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { isRight } from 'fp-ts/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import type { Environment } from '../../common/environment_rt';
import { environmentRt } from '../../common/environment_rt';
import { apmRouter } from '../components/routing/apm_route_config';
import type { TimePickerTimeDefaults } from '../components/shared/date_picker/typings';

const SERVICE_OVERVIEW_TAB_PATHS = {
  logs: '/services/{serviceName}/logs',
  metrics: '/services/{serviceName}/metrics',
  traces: '/services/{serviceName}/transactions',
  transactions: '/services/{serviceName}/transactions/view',
  errors: '/services/{serviceName}/errors',
  default: '/services/{serviceName}/overview',
} as const;

export const APMLocatorPayloadValidator = t.union([
  t.type({ serviceName: t.undefined }),
  t.intersection([
    t.type({ serviceName: t.string }),
    t.type({ dashboardId: t.string }),
    t.type({ query: environmentRt }),
  ]),
  t.intersection([
    t.type({
      serviceName: t.string,
    }),
    t.partial({ dashboardId: t.undefined }),
    t.partial({
      serviceOverviewTab: t.keyof({
        traces: null,
        metrics: null,
        logs: null,
        errors: null,
        transactions: null,
      }),
      errorGroupId: t.string,
    }),
    t.type({
      query: t.intersection([
        environmentRt,
        t.partial({ kuery: t.string, rangeFrom: t.string, rangeTo: t.string }),
      ]),
    }),
  ]),
]);

export type APMLocatorPayload = t.TypeOf<typeof APMLocatorPayloadValidator>;

export function getPathForServiceDetail(
  payload: APMLocatorPayload,
  {
    from,
    to,
    isComparisonEnabledByDefault,
    defaultEnvironment,
  }: TimePickerTimeDefaults & {
    isComparisonEnabledByDefault: boolean;
    defaultEnvironment: string;
  }
) {
  const decodedPayload = APMLocatorPayloadValidator.decode(payload);

  if (!isRight(decodedPayload)) {
    throw new Error(PathReporter.report(decodedPayload).join('\n'));
  }

  const defaultQueryParams = {
    kuery: '',
    serviceGroup: '',
    comparisonEnabled: isComparisonEnabledByDefault,
    rangeFrom: from,
    rangeTo: to,
    environment: defaultEnvironment as Environment,
  } as const;

  if (!payload.serviceName) {
    return apmRouter.link('/services', {
      query: defaultQueryParams,
    });
  }

  if (payload.dashboardId !== undefined) {
    return apmRouter.link('/services/{serviceName}/dashboards', {
      path: {
        serviceName: payload.serviceName,
      },
      query: {
        ...defaultQueryParams,
        ...payload.query,
        dashboardId: payload.dashboardId,
      },
    });
  }

  const query = {
    ...defaultQueryParams,
    ...payload.query,
  };

  if (payload.serviceOverviewTab === 'errors' && payload.errorGroupId) {
    return apmRouter.link('/services/{serviceName}/errors/{groupId}', {
      path: {
        serviceName: payload.serviceName,
        groupId: payload.errorGroupId,
      },
      query,
    });
  }

  const apmPath = SERVICE_OVERVIEW_TAB_PATHS[payload.serviceOverviewTab || 'default'];

  return apmRouter.link(apmPath, {
    path: { serviceName: payload.serviceName },
    query,
  });
}
