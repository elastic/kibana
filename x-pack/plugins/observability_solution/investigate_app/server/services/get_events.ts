/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import {
  GetEventsParams,
  GetEventsResponse,
  getEventsResponseSchema,
} from '@kbn/investigation-shared';
import { ScopedAnnotationsClient } from '@kbn/observability-plugin/server';
import {
  ALERT_REASON,
  ALERT_RULE_CATEGORY,
  ALERT_START,
  ALERT_STATUS,
  ALERT_UUID,
} from '@kbn/rule-data-utils';
import { AlertsClient } from './get_alerts_client';
import { rangeQuery } from '../lib/queries';

export async function getAnnotationEvents(
  params: GetEventsParams,
  annotationsClient: ScopedAnnotationsClient
): Promise<GetEventsResponse> {
  const response = await annotationsClient.find({
    start: params?.rangeFrom,
    end: params?.rangeTo,
    filter: params?.filter,
    size: 100,
  });

  // we will return only "point_in_time" annotations
  const events = response.items
    .filter((item) => !item.event?.end)
    .map((item) => {
      const hostName = item.host?.name;
      const serviceName = item.service?.name;
      const serviceVersion = item.service?.version;
      const sloId = item.slo?.id;
      const sloInstanceId = item.slo?.instanceId;

      return {
        id: item.id,
        title: item.annotation.title,
        description: item.message,
        timestamp: new Date(item['@timestamp']).getTime(),
        eventType: 'annotation',
        annotationType: item.annotation.type,
        source: {
          ...(hostName ? { 'host.name': hostName } : undefined),
          ...(serviceName ? { 'service.name': serviceName } : undefined),
          ...(serviceVersion ? { 'service.version': serviceVersion } : undefined),
          ...(sloId ? { 'slo.id': sloId } : undefined),
          ...(sloInstanceId ? { 'slo.instanceId': sloInstanceId } : undefined),
        },
      };
    });

  return getEventsResponseSchema.parse(events);
}

export async function getAlertEvents(
  params: GetEventsParams,
  alertsClient: AlertsClient
): Promise<GetEventsResponse> {
  const startInMs = datemath.parse(params?.rangeFrom ?? 'now-15m')!.valueOf();
  const endInMs = datemath.parse(params?.rangeTo ?? 'now')!.valueOf();
  const filterJSON = params?.filter ? JSON.parse(params.filter) : {};

  const body = {
    size: 100,
    track_total_hits: false,
    query: {
      bool: {
        filter: [
          ...rangeQuery(startInMs, endInMs, ALERT_START),
          ...Object.keys(filterJSON).map((filterKey) => ({
            term: { [filterKey]: filterJSON[filterKey] },
          })),
        ],
      },
    },
  };

  const response = await alertsClient.search(body);

  const events = response.hits.hits.map((hit) => {
    const _source = hit._source;

    return {
      id: _source[ALERT_UUID],
      title: `${_source[ALERT_RULE_CATEGORY]} breached`,
      description: _source[ALERT_REASON],
      timestamp: new Date(_source[ALERT_START] as string).getTime(),
      eventType: 'alert',
      alertStatus: _source[ALERT_STATUS],
    };
  });

  return getEventsResponseSchema.parse(events);
}
