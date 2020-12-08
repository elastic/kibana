/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { upperFirst } from 'lodash';
import { LegacyRequest, ElasticsearchResponse } from '../../types';
// @ts-ignore
import { checkParam } from '../error_missing_required';
// @ts-ignore
import { createBeatsQuery } from './create_beats_query.js';
// @ts-ignore
import { getDiffCalculation } from './_beats_stats';

export function handleResponse(response: ElasticsearchResponse, beatUuid: string) {
  if (!response.hits || response.hits.hits.length === 0) {
    return {};
  }

  const firstStats = response.hits.hits[0].inner_hits.first_hit.hits.hits[0]._source.beats_stats;
  const stats = response.hits.hits[0]._source.beats_stats;

  const eventsTotalFirst = firstStats?.metrics?.libbeat?.pipeline?.events?.total ?? null;
  const eventsEmittedFirst = firstStats?.metrics?.libbeat?.pipeline?.events?.published ?? null;
  const eventsDroppedFirst = firstStats?.metrics?.libbeat?.pipeline?.events?.dropped ?? null;
  const bytesWrittenFirst = firstStats?.metrics?.libbeat?.output?.write?.bytes ?? null;

  const eventsTotalLast = stats?.metrics?.libbeat?.pipeline?.events?.total ?? null;
  const eventsEmittedLast = stats?.metrics?.libbeat?.pipeline?.events?.published ?? null;
  const eventsDroppedLast = stats?.metrics?.libbeat?.pipeline?.events?.dropped ?? null;
  const bytesWrittenLast = stats?.metrics?.libbeat?.output?.write?.bytes ?? null;
  const handlesHardLimit = stats?.metrics?.beat?.handles?.limit?.hard ?? null;
  const handlesSoftLimit = stats?.metrics?.beat?.handles?.limit?.soft ?? null;

  return {
    uuid: beatUuid,
    transportAddress: stats?.beat?.host ?? null,
    version: stats?.beat?.version ?? null,
    name: stats?.beat?.name ?? null,
    type: upperFirst(stats?.beat?.type) ?? null,
    output: upperFirst(stats?.metrics?.libbeat?.output?.type) ?? null,
    configReloads: stats?.metrics?.libbeat?.config?.reloads ?? null,
    uptime: stats?.metrics?.beat?.info?.uptime?.ms ?? null,
    eventsTotal: getDiffCalculation(eventsTotalLast, eventsTotalFirst) ?? null,
    eventsEmitted: getDiffCalculation(eventsEmittedLast, eventsEmittedFirst) ?? null,
    eventsDropped: getDiffCalculation(eventsDroppedLast, eventsDroppedFirst) ?? null,
    bytesWritten: getDiffCalculation(bytesWrittenLast, bytesWrittenFirst) ?? null,
    handlesHardLimit,
    handlesSoftLimit,
  };
}

export async function getBeatSummary(
  req: LegacyRequest,
  beatsIndexPattern: string,
  {
    clusterUuid,
    beatUuid,
    start,
    end,
  }: { clusterUuid: string; beatUuid: string; start: number; end: number }
) {
  checkParam(beatsIndexPattern, 'beatsIndexPattern in beats/getBeatSummary');

  const filters = [{ term: { 'beats_stats.beat.uuid': beatUuid } }];
  const params = {
    index: beatsIndexPattern,
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
      'hits.hits._source.beats_stats.metrics.beat.handles.limit.hard',
      'hits.hits._source.beats_stats.metrics.beat.handles.limit.soft',
      'hits.hits.inner_hits.first_hit.hits.hits._source.beats_stats.metrics.libbeat.pipeline.events.published',
      'hits.hits.inner_hits.first_hit.hits.hits._source.beats_stats.metrics.libbeat.pipeline.events.total',
      'hits.hits.inner_hits.first_hit.hits.hits._source.beats_stats.metrics.libbeat.pipeline.events.dropped',
      'hits.hits.inner_hits.first_hit.hits.hits._source.beats_stats.metrics.libbeat.output.write.bytes',
    ],
    body: {
      sort: { timestamp: { order: 'desc', unmapped_type: 'long' } },
      query: createBeatsQuery({
        start,
        end,
        clusterUuid,
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
  const response = await callWithRequest(req, 'search', params);

  return handleResponse(response, beatUuid);
}
