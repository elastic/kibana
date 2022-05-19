/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { isRight } from 'fp-ts/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { Environment, environmentRt } from '../../common/environment_rt';
import { apmRouter } from '../components/routing/apm_route_config';
import type { TimePickerTimeDefaults } from '../components/shared/date_picker/typings';

export const APMLocatorPayloadValidator = t.union([
  t.type({ serviceName: t.undefined }),
  t.intersection([
    t.type({
      serviceName: t.string,
    }),
    t.partial({
      serviceOverviewTab: t.keyof({
        traces: null,
        metrics: null,
        logs: null,
        errors: null,
      }),
    }),
    t.type({
      query: environmentRt,
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

  const mapObj = {
    logs: '/services/{serviceName}/logs',
    metrics: '/services/{serviceName}/metrics',
    traces: '/services/{serviceName}/transactions',
    errors: '/services/{serviceName}/errors',
    default: '/services/{serviceName}/overview',
  } as const;
  const apmPath = mapObj[payload.serviceOverviewTab || 'default'];

  const query = {
    ...defaultQueryParams,
    ...payload.query,
  };

  const path = apmRouter.link(apmPath, {
    path: { serviceName: payload.serviceName },
    query,
  });

  return path;
}
