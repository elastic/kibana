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
  alerts: {
    regular: '/services/{serviceName}/alerts',
    mobile: '/mobile-services/{serviceName}/alerts',
  },
  logs: {
    regular: '/services/{serviceName}/logs',
    mobile: '/mobile-services/{serviceName}/logs',
  },
  metrics: { regular: '/services/{serviceName}/metrics' },
  traces: {
    regular: '/services/{serviceName}/transactions',
    mobile: '/mobile-services/{serviceName}/transactions',
  },
  transactions: { regular: '/services/{serviceName}/transactions/view' },
  errors: { regular: '/services/{serviceName}/errors' },
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
      isMobileAgentName: t.boolean,
      serviceOverviewTab: t.keyof({
        alerts: null,
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
        t.partial({
          kuery: t.string,
          rangeFrom: t.string,
          rangeTo: t.string,
          comparisonEnabled: t.boolean,
          offset: t.string,
          anomalyThreshold: t.string,
        }),
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

  // Handle overview first with explicit path literals (mobile vs regular) so the
  // typed router sees a specific route rather than a union when validating the query.
  if (!payload.serviceOverviewTab) {
    if (payload.isMobileAgentName) {
      return apmRouter.link('/mobile-services/{serviceName}/overview', {
        path: { serviceName: payload.serviceName },
        query,
      });
    }
    return apmRouter.link('/services/{serviceName}/overview', {
      path: { serviceName: payload.serviceName },
      query,
    });
  }

  if (payload.serviceOverviewTab === 'errors' && payload.errorGroupId) {
    return apmRouter.link('/services/{serviceName}/errors/{groupId}', {
      path: {
        serviceName: payload.serviceName,
        groupId: payload.errorGroupId,
      },
      query,
    });
  }

  const tabPaths = SERVICE_OVERVIEW_TAB_PATHS[payload.serviceOverviewTab];
  const apmPath =
    payload.isMobileAgentName && 'mobile' in tabPaths ? tabPaths.mobile : tabPaths.regular;

  return apmRouter.link(apmPath, {
    path: { serviceName: payload.serviceName },
    query,
  });
}
