/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { upperFirst, get } from 'lodash';
import { checkParam } from '../error_missing_required';
import { createBeatsQuery } from './create_beats_query.js';
import { getDiffCalculation } from './_beats_stats';

export function handleResponse(response, beatUuid) {
  const firstStats = get(
    response,
    'hits.hits[0].inner_hits.first_hit.hits.hits[0]._source.beats_stats'
  );
  const stats = get(response, 'hits.hits[0]._source.beats_stats');

  const eventsTotalFirst = get(firstStats, 'metrics.libbeat.pipeline.events.total', null);
  const eventsEmittedFirst = get(firstStats, 'metrics.libbeat.pipeline.events.published', null);
  const eventsDroppedFirst = get(firstStats, 'metrics.libbeat.pipeline.events.dropped', null);
  const bytesWrittenFirst = get(firstStats, 'metrics.libbeat.output.write.bytes', null);

  const eventsTotalLast = get(stats, 'metrics.libbeat.pipeline.events.total', null);
  const eventsEmittedLast = get(stats, 'metrics.libbeat.pipeline.events.published', null);
  const eventsDroppedLast = get(stats, 'metrics.libbeat.pipeline.events.dropped', null);
  const bytesWrittenLast = get(stats, 'metrics.libbeat.output.write.bytes', null);
  const handlesHardLimit = get(stats, 'metrics.beat.handles.limit.hard', null);
  const handlesSoftLimit = get(stats, 'metrics.beat.handles.limit.soft', null);

  return {
    uuid: beatUuid,
    transportAddress: get(stats, 'beat.host', null),
    version: get(stats, 'beat.version', null),
    name: get(stats, 'beat.name', null),
    type: upperFirst(get(stats, 'beat.type')) || null,
    output: upperFirst(get(stats, 'metrics.libbeat.output.type')) || null,
    configReloads: get(stats, 'metrics.libbeat.config.reloads', null),
    uptime: get(stats, 'metrics.beat.info.uptime.ms', null),
    eventsTotal: getDiffCalculation(eventsTotalLast, eventsTotalFirst),
    eventsEmitted: getDiffCalculation(eventsEmittedLast, eventsEmittedFirst),
    eventsDropped: getDiffCalculation(eventsDroppedLast, eventsDroppedFirst),
    bytesWritten: getDiffCalculation(bytesWrittenLast, bytesWrittenFirst),
    handlesHardLimit,
    handlesSoftLimit,
  };
}

export async function getBeatSummary(
  req,
  beatsIndexPattern,
  { clusterUuid, beatUuid, start, end }
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
      sort: { timestamp: { order: 'desc' } },
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
          sort: { 'beats_stats.timestamp': 'asc' },
        },
      },
    },
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  const response = await callWithRequest(req, 'search', params);

  return handleResponse(response, beatUuid);
}
