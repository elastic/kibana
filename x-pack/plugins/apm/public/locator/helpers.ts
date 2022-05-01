/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { isRight } from 'fp-ts/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { environmentRt } from '../../common/environment_rt';
import { apmRouter } from '../components/routing/apm_route_config';
import type { TimePickerTimeDefaults } from '../components/shared/date_picker/typings';

export const APMLocatorPayloadValidator = t.intersection([
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

export function getPathForServiceDetail(
  payload: APMLocatorPayload,
  { from, to }: TimePickerTimeDefaults
) {
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

  const defaultQueryParams = {
    kuery: '',
    serviceGroup: '',
    comparisonEnabled: false,
    rangeFrom: from,
    rangeTo: to,
  } as const;

  const path = apmRouter.link(apmPath, {
    path: { serviceName: payload.serviceName },
    query: {
      ...defaultQueryParams,
      ...payload.query,
    },
  });

  return path;
}
