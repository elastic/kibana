/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import datemath from '@elastic/datemath';
import { estypes } from '@elastic/elasticsearch';
import { ElasticsearchClient } from '@kbn/core/server';
import {
  GetEventsParams,
  GetEventsResponse,
  getEventsResponseSchema,
} from '@kbn/investigation-shared';
import { Annotation } from '@kbn/observability-plugin/common/annotations';
import { ScopedAnnotationsClient, unwrapEsResponse } from '@kbn/observability-plugin/server';
import {
  ALERT_REASON,
  ALERT_RULE_CATEGORY,
  ALERT_START,
  ALERT_STATUS,
  ALERT_UUID,
} from '@kbn/rule-data-utils';
import { AlertsClient } from './get_alerts_client';

export function rangeQuery(
  start: number,
  end: number,
  field = '@timestamp'
): estypes.QueryDslQueryContainer[] {
  return [
    {
      range: {
        [field]: {
          gte: start,
          lte: end,
          format: 'epoch_millis',
        },
      },
    },
  ];
}

export async function getAnnotationEvents(
  params: GetEventsParams,
  esClient: ElasticsearchClient,
  annotationsClient: ScopedAnnotationsClient
): Promise<GetEventsResponse> {
  const startInMs = datemath.parse(params?.rangeFrom ?? 'now-15m')!.valueOf();
  const endInMs = datemath.parse(params?.rangeTo ?? 'now')!.valueOf();
  const filterJSON = params?.filter ? JSON.parse(params.filter) : {};

  const body = {
    size: 100,
    query: {
      bool: {
        filter: [
          ...rangeQuery(startInMs, endInMs),
          ...Object.keys(filterJSON).map((filterKey) => ({
            term: { [filterKey]: filterJSON[filterKey] },
          })),
        ],
      },
    },
  };

  try {
    const response = await unwrapEsResponse(
      esClient.search(
        {
          index: annotationsClient.index,
          body,
        },
        { meta: true }
      )
    );

    // we will return only "point_in_time" annotations
    const events = response.hits.hits
      .filter((hit) => !(hit._source as Annotation).event?.end)
      .map((hit) => {
        const _source = hit._source as Annotation;
        const hostName = _source.host?.name;
        const serviceName = _source.service?.name;
        const serviceVersion = _source.service?.version;
        const sloId = _source.slo?.id;
        const sloInstanceId = _source.slo?.instanceId;

        return {
          id: hit._id,
          title: _source.annotation.title,
          description: _source.message,
          timestamp: new Date(_source['@timestamp']).getTime(),
          eventType: 'annotation',
          annotationType: _source.annotation.type,
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
  } catch (error) {
    // index is only created when an annotation has been indexed,
    // so we should handle this error gracefully
    return [];
  }
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
      timestamp: new Date(_source['@timestamp']).getTime(),
      eventType: 'alert',
      alertStatus: _source[ALERT_STATUS],
    };
  });

  return getEventsResponseSchema.parse(events);
}
