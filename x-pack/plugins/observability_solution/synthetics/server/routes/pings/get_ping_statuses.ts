/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SyntheticsRestApiRouteFactory } from '../types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { PingError, PingStatus } from '../../../common/runtime_types';
import { queryPings } from '../../common/pings/query_pings';

import { getPingsRouteQuerySchema } from './get_pings';

export const syntheticsGetPingStatusesRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.PING_STATUSES,
  validate: {
    query: getPingsRouteQuerySchema,
  },
  handler: async ({ syntheticsEsClient, request, response }): Promise<any> => {
    const {
      from,
      to,
      index,
      monitorId,
      status,
      sort,
      size,
      pageIndex,
      locations,
      excludedLocations,
    } = request.query;

    const result = await queryPings<PingStatus>({
      syntheticsEsClient,
      dateRange: { from, to },
      index,
      monitorId,
      status,
      sort,
      size,
      pageIndex,
      locations: locations ? JSON.parse(locations) : [],
      excludedLocations,
      fields: ['@timestamp', 'config_id', 'summary.*', 'error.*', 'observer.geo.name'],
      fieldsExtractorFn: extractPingStatus,
    });

    return {
      ...result,
      from,
      to,
    };
  },
});

function grabPingError(doc: any): PingError | undefined {
  const docContainsError = Object.keys(doc?.fields ?? {}).some((key) => key.startsWith('error.'));
  if (!docContainsError) {
    return undefined;
  }

  return {
    code: doc.fields['error.code']?.[0],
    id: doc.fields['error.id']?.[0],
    stack_trace: doc.fields['error.stack_trace']?.[0],
    type: doc.fields['error.type']?.[0],
    message: doc.fields['error.message']?.[0],
  };
}

function extractPingStatus(doc: any) {
  return {
    timestamp: doc.fields['@timestamp']?.[0],
    docId: doc._id,
    config_id: doc.fields.config_id?.[0],
    locationId: doc.fields['observer.geo.name']?.[0],
    summary: { up: doc.fields['summary.up']?.[0], down: doc.fields['summary.down']?.[0] },
    error: grabPingError(doc),
  } as PingStatus;
}
