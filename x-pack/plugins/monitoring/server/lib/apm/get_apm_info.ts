/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
import { LegacyRequest } from '../../types';
import { ElasticsearchResponse } from '../../../common/types/es';
import { MonitoringConfig } from '../../config';

export function handleResponse(
  response: ElasticsearchResponse,
  apmUuid: string,
  config: MonitoringConfig
) {
  if (!response.hits || response.hits.hits.length === 0) {
    return {};
  }

  const firstHit = response.hits.hits[0];

  let firstStatsMetrics = null;
  if (
    firstHit.inner_hits?.first_hit?.hits?.hits &&
    firstHit.inner_hits?.first_hit?.hits?.hits.length > 0
  ) {
    firstStatsMetrics =
      firstHit.inner_hits.first_hit.hits.hits[0]._source.beats_stats?.metrics ??
      firstHit.inner_hits.first_hit.hits.hits[0]._source.beat?.stats;
  }

  const stats = firstHit._source.beats_stats ?? firstHit._source?.beat?.stats;
  const statsMetrics = firstHit._source.beats_stats?.metrics ?? firstHit._source?.beat?.stats;

  const eventsTotalFirst = firstStatsMetrics?.libbeat?.pipeline?.events?.total ?? null;
  const eventsEmittedFirst = firstStatsMetrics?.libbeat?.pipeline?.events?.published ?? null;
  const eventsDroppedFirst = firstStatsMetrics?.libbeat?.pipeline?.events?.dropped ?? null;
  const bytesWrittenFirst = firstStatsMetrics?.libbeat?.output?.write?.bytes ?? null;

  const eventsTotalLast = statsMetrics?.libbeat?.pipeline?.events?.total ?? null;
  const eventsEmittedLast = statsMetrics?.libbeat?.pipeline?.events?.published ?? null;
  const eventsDroppedLast = statsMetrics?.libbeat?.pipeline?.events?.dropped ?? null;
  const bytesWrittenLast = statsMetrics?.libbeat?.output?.write?.bytes ?? null;

  return {
    uuid: apmUuid,
    transportAddress: stats?.beat?.host,
    version: stats?.beat?.version,
    name: stats?.beat?.name,
    type: upperFirst(stats?.beat?.type) || null,
    output: upperFirst(statsMetrics?.libbeat?.output?.type) ?? null,
    configReloads: statsMetrics?.libbeat?.config?.reloads ?? null,
    uptime:
      firstHit._source.beats_stats?.metrics?.beat?.info?.uptime?.ms ??
      firstHit._source.beat?.stats?.info?.uptime?.ms,
    eventsTotal: getDiffCalculation(eventsTotalLast, eventsTotalFirst),
    eventsEmitted: getDiffCalculation(eventsEmittedLast, eventsEmittedFirst),
    eventsDropped: getDiffCalculation(eventsDroppedLast, eventsDroppedFirst),
    bytesWritten: getDiffCalculation(Number(bytesWrittenLast), Number(bytesWrittenFirst)),
    config: {
      container: config.ui.container.apm.enabled,
    },
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
    start?: number;
    end?: number;
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
    ignore_unavailable: true,
    filter_path: [
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

      'hits.hits._source.beat.stats.beat.host',
      'hits.hits._source.beat.stats.beat.version',
      'hits.hits._source.beat.stats.beat.name',
      'hits.hits._source.beat.stats.beat.type',
      'hits.hits._source.beat.stats.libbeat.output.type',
      'hits.hits._source.beat.stats.libbeat.pipeline.events.published',
      'hits.hits._source.beat.stats.libbeat.pipeline.events.total',
      'hits.hits._source.beat.stats.libbeat.pipeline.events.dropped',
      'hits.hits._source.beat.stats.libbeat.output.write.bytes',
      'hits.hits._source.beat.stats.libbeat.config.reloads',
      'hits.hits._source.beat.stats.info.uptime.ms',
      'hits.hits.inner_hits.first_hit.hits.hits._source.beat.stats.libbeat.pipeline.events.published',
      'hits.hits.inner_hits.first_hit.hits.hits._source.beat.stats.libbeat.pipeline.events.total',
      'hits.hits.inner_hits.first_hit.hits.hits._source.beat.stats.libbeat.pipeline.events.dropped',
      'hits.hits.inner_hits.first_hit.hits.hits._source.beat.stats.libbeat.output.write.bytes',
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
          sort: [
            { 'beats_stats.timestamp': { order: 'asc', unmapped_type: 'long' } },
            { '@timestamp': { order: 'asc', unmapped_type: 'long' } },
          ],
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

  const formattedResponse = handleResponse(response, apmUuid, req.server.config);
  return {
    ...formattedResponse,
    timeOfLastEvent,
  };
}
