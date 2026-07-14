/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { environmentSchema } from '@kbn/apm-types';
import type { Environment } from '../../common/environment_rt';
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

export const APMLocatorPayloadValidator = z.union([
  z.object({ serviceName: z.undefined() }),
  z
    .object({ serviceName: z.string() })
    .merge(z.object({ dashboardId: z.string() }))
    .merge(z.object({ query: environmentSchema })),
  z
    .object({
      serviceName: z.string(),
    })
    .merge(z.object({ dashboardId: z.undefined().optional() }))
    .merge(
      z.object({
        serviceOverviewTab: z
          .enum(['traces', 'metrics', 'logs', 'errors', 'transactions'])
          .optional(),
        errorGroupId: z.string().optional(),
      })
    )
    .merge(
      z.object({
        query: environmentSchema.merge(
          z.object({
            kuery: z.string().optional(),
            rangeFrom: z.string().optional(),
            rangeTo: z.string().optional(),
          })
        ),
      })
    ),
]);

export type APMLocatorPayload = z.infer<typeof APMLocatorPayloadValidator>;

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
  const decodedPayload = APMLocatorPayloadValidator.safeParse(payload);

  if (!decodedPayload.success) {
    throw new Error(
      decodedPayload.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('\n')
    );
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
