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

  const eventsTotalFirst = firstStats?.metrics.libbeat.pipeline.events.total;
  const eventsEmittedFirst = firstStats?.metrics.libbeat.pipeline.events.published;
  const eventsDroppedFirst = firstStats?.metrics.libbeat.pipeline.events.dropped;
  const bytesWrittenFirst = firstStats?.metrics.libbeat.output.write.bytes;

  const eventsTotalLast = stats?.metrics.libbeat.pipeline.events.total;
  const eventsEmittedLast = stats?.metrics.libbeat.pipeline.events.published;
  const eventsDroppedLast = stats?.metrics.libbeat.pipeline.events.dropped;
  const bytesWrittenLast = stats?.metrics.libbeat.output.write.bytes;
  const handlesHardLimit = stats?.metrics.beat.handles?.limit.hard;
  const handlesSoftLimit = stats?.metrics.beat.handles?.limit.soft;

  return {
    uuid: beatUuid,
    transportAddress: stats?.beat.host,
    version: stats?.beat.version,
    name: stats?.beat.name,
    type: upperFirst(stats?.beat.type),
    output: upperFirst(stats?.metrics.libbeat.output.type),
    configReloads: stats?.metrics.libbeat.config.reloads,
    uptime: stats?.metrics.beat.info.uptime.ms,
    eventsTotal: getDiffCalculation(eventsTotalLast, eventsTotalFirst),
    eventsEmitted: getDiffCalculation(eventsEmittedLast, eventsEmittedFirst),
    eventsDropped: getDiffCalculation(eventsDroppedLast, eventsDroppedFirst),
    bytesWritten: getDiffCalculation(bytesWrittenLast, bytesWrittenFirst),
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
