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
import { ScopedAnnotationsClient, unwrapEsResponse } from '@kbn/observability-plugin/server';
import {
  ALERT_REASON,
  ALERT_RULE_CATEGORY,
  ALERT_START,
  ALERT_STATUS,
  ALERT_UUID,
} from '@kbn/rule-data-utils';

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
  const sourceJson = params?.source ? JSON.parse(params?.source) : {};

  const body = {
    size: 100,
    query: {
      bool: {
        filter: [
          ...rangeQuery(startInMs, endInMs),
          ...Object.keys(sourceJson).map((sourceKey) => ({
            term: { [sourceKey]: sourceJson[sourceKey] },
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

    const events = response.hits.hits.map((hit) => {
      const _source = hit._source as any;
      const hostName = _source.host?.name;
      const serviceName = _source.service?.name;
      const sloId = _source.slo?.id;
      const sloInstanceId = _source.slo?.instanceId;

      return {
        id: hit._id as string,
        title: _source.annotation.title,
        description: _source.message,
        timestamp: new Date(_source['@timestamp']).getTime(),
        type: 'annotation' as const,
        details: {
          type: _source.type,
          end: _source['event.end'],
        },
        source: {
          ...(hostName ? { 'host.name': hostName } : undefined),
          ...(serviceName ? { 'service.name': serviceName } : undefined),
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
  alertsClient: any
): Promise<GetEventsResponse> {
  const startInMs = datemath.parse(params?.rangeFrom ?? 'now-15m')!.valueOf();
  const endInMs = datemath.parse(params?.rangeTo ?? 'now')!.valueOf();
  const sourceJson = params?.source ? JSON.parse(params?.source) : {};

  const body = {
    size: 100,
    track_total_hits: false,
    query: {
      bool: {
        filter: [
          ...rangeQuery(startInMs, endInMs, ALERT_START),
          ...Object.keys(sourceJson).map((sourceKey) => ({
            term: { [sourceKey]: sourceJson[sourceKey] },
          })),
        ],
      },
    },
  };

  const response = await alertsClient.search(body);

  const events = response.hits.hits.map((hit: any) => {
    const _source = hit._source as any;

    return {
      id: _source[ALERT_UUID],
      title: `${_source[ALERT_RULE_CATEGORY]} breached`,
      description: _source[ALERT_REASON],
      timestamp: new Date(_source['@timestamp']).getTime(),
      type: 'alert' as const,
      details: {
        status: _source[ALERT_STATUS],
      },
    };
  });

  return getEventsResponseSchema.parse(events);
}
