/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { anomalyThresholdSchema, environmentSchema } from '@kbn/apm-types';
import type { Environment } from '../../common/environment_rt';
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
    .merge(z.object({ isMobileAgentName: z.boolean().optional() }))
    .merge(
      z.object({
        serviceOverviewTab: z
          .enum(['alerts', 'traces', 'metrics', 'logs', 'errors', 'transactions'])
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
            transactionType: z.string().optional(),
            anomalyThreshold: anomalyThresholdSchema.optional(),
            comparisonEnabled: z.boolean().optional(),
            offset: z.string().optional(),
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

  // Destructure anomaly-specific fields separately to avoid widening comparisonEnabled and
  // anomalyThreshold to types incompatible with the route query schemas.
  const {
    anomalyThreshold,
    comparisonEnabled: payloadComparisonEnabled,
    offset,
    ...basePayloadQuery
  } = payload.query;

  const query = {
    ...defaultQueryParams,
    ...basePayloadQuery,
  };

  if (payload.serviceOverviewTab === 'errors' && payload.errorGroupId) {
    return apmRouter.link('/services/{serviceName}/errors/{groupId}', {
      path: {
        serviceName: payload.serviceName,
        groupId: payload.errorGroupId,
      },
      query: {
        ...query,
        comparisonEnabled: payloadComparisonEnabled ?? isComparisonEnabledByDefault,
        ...{ offset },
      },
    });
  }

  if (!payload.serviceOverviewTab) {
    const overviewQuery = {
      ...query,
      ...{ anomalyThreshold },
      comparisonEnabled: payloadComparisonEnabled ?? isComparisonEnabledByDefault,
      ...{ offset },
    };
    if (payload.isMobileAgentName) {
      return apmRouter.link('/mobile-services/{serviceName}/overview', {
        path: { serviceName: payload.serviceName },
        query: overviewQuery,
      });
    }
    return apmRouter.link('/services/{serviceName}/overview', {
      path: { serviceName: payload.serviceName },
      query: overviewQuery,
    });
  }

  const tabPaths = SERVICE_OVERVIEW_TAB_PATHS[payload.serviceOverviewTab];
  const apmPath =
    payload.isMobileAgentName && 'mobile' in tabPaths ? tabPaths.mobile : tabPaths.regular;

  return apmRouter.link(apmPath, {
    path: { serviceName: payload.serviceName },
    query: {
      ...query,
      comparisonEnabled: payloadComparisonEnabled ?? isComparisonEnabledByDefault,
      ...{ offset },
    },
  });
}
