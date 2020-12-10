/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { upperFirst } from 'lodash';
// @ts-ignore
import { checkParam } from '../error_missing_required';
// @ts-ignore
import { createQuery } from '../create_query';
// @ts-ignore
import { getDiffCalculation } from '../beats/_beats_stats';
// @ts-ignore
import { ApmMetric } from '../metrics';
import { getTimeOfLastEvent } from './_get_time_of_last_event';
import { LegacyRequest, ElasticsearchResponse } from '../../types';

export function handleResponse(response: ElasticsearchResponse, apmUuid: string) {
  if (!response.hits || response.hits.hits.length === 0) {
    return {};
  }

  const firstStats = response.hits.hits[0].inner_hits.first_hit.hits.hits[0]._source.beats_stats;
  const stats = response.hits.hits[0]._source.beats_stats;

  if (!firstStats || !stats) {
    return {};
  }

  const eventsTotalFirst = firstStats.metrics?.libbeat?.pipeline?.events?.total;
  const eventsEmittedFirst = firstStats.metrics?.libbeat?.pipeline?.events?.published;
  const eventsDroppedFirst = firstStats.metrics?.libbeat?.pipeline?.events?.dropped;
  const bytesWrittenFirst = firstStats.metrics?.libbeat?.output?.write?.bytes;

  const eventsTotalLast = stats.metrics?.libbeat?.pipeline?.events?.total;
  const eventsEmittedLast = stats.metrics?.libbeat?.pipeline?.events?.published;
  const eventsDroppedLast = stats.metrics?.libbeat?.pipeline?.events?.dropped;
  const bytesWrittenLast = stats.metrics?.libbeat?.output?.write?.bytes;

  return {
    uuid: apmUuid,
    transportAddress: stats.beat?.host,
    version: stats.beat?.version,
    name: stats.beat?.name,
    type: upperFirst(stats.beat?.type) || null,
    output: upperFirst(stats.metrics?.libbeat?.output?.type) || null,
    configReloads: stats.metrics?.libbeat?.config?.reloads,
    uptime: stats.metrics?.beat?.info?.uptime?.ms,
    eventsTotal: getDiffCalculation(eventsTotalLast, eventsTotalFirst),
    eventsEmitted: getDiffCalculation(eventsEmittedLast, eventsEmittedFirst),
    eventsDropped: getDiffCalculation(eventsDroppedLast, eventsDroppedFirst),
    bytesWritten: getDiffCalculation(bytesWrittenLast, bytesWrittenFirst),
  };
}

export async function getApmInfo(
  req: LegacyRequest,
  apmIndexPattern: string,
  {
    clusterUuid,
    apmUuid,
    start,
    end,
  }: {
    clusterUuid: string;
    apmUuid: string;
    start: number;
    end: number;
  }
) {
  checkParam(apmIndexPattern, 'apmIndexPattern in beats/getBeatSummary');

  const filters = [
    { term: { 'beats_stats.beat.uuid': apmUuid } },
    { term: { 'beats_stats.beat.type': 'apm-server' } },
  ];
  const params = {
    index: apmIndexPattern,
    size: 1,
    ignoreUnavailable: true,
    filterPath: [
      'hits.hits._source.beats_stats.beat.host',
      'hits.hits._source.beats_stats.beat.version',
      'hits.hits._source.beats_stats.beat.name',
      'hits.hits._source.beats_stats.beat.type',
      'hits.hits._source.beats_stats.metrics.libbeat.output.type',
      'hits.hits._source.beats_stats.metrics.libbeat.pipeline.events.published',
      'hits.hits._source.beats_stats.metrics.libbeat.pipeline.events.total',
      'hits.hits._source.beats_stats.metrics.libbeat.pipeline.events.dropped',
      'hits.hits._source.beats_stats.metrics.libbeat.output.write.bytes',
      'hits.hits._source.beats_stats.metrics.libbeat.config.reloads',
      'hits.hits._source.beats_stats.metrics.beat.info.uptime.ms',
      'hits.hits.inner_hits.first_hit.hits.hits._source.beats_stats.metrics.libbeat.pipeline.events.published',
      'hits.hits.inner_hits.first_hit.hits.hits._source.beats_stats.metrics.libbeat.pipeline.events.total',
      'hits.hits.inner_hits.first_hit.hits.hits._source.beats_stats.metrics.libbeat.pipeline.events.dropped',
      'hits.hits.inner_hits.first_hit.hits.hits._source.beats_stats.metrics.libbeat.output.write.bytes',
    ],
    body: {
      sort: { timestamp: { order: 'desc', unmapped_type: 'long' } },
      query: createQuery({
        start,
        end,
        clusterUuid,
        metric: ApmMetric.getMetricFields(),
        filters,
      }),
      collapse: {
        field: 'beats_stats.metrics.beat.info.ephemeral_id', // collapse on ephemeral_id to handle restart
        inner_hits: {
          name: 'first_hit',
          size: 1,
          sort: { 'beats_stats.timestamp': { order: 'asc', unmapped_type: 'long' } },
        },
      },
    },
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');

  const [response, timeOfLastEvent] = await Promise.all([
    callWithRequest(req, 'search', params),
    getTimeOfLastEvent({
      req,
      callWithRequest,
      apmIndexPattern,
      start,
      end,
      clusterUuid,
    }),
  ]);

  const formattedResponse = handleResponse(response, apmUuid);
  return {
    ...formattedResponse,
    timeOfLastEvent,
  };
}
