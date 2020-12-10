/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { upperFirst } from 'lodash';
// @ts-ignore
import { checkParam } from '../error_missing_required';
// @ts-ignore
import { createApmQuery } from './create_apm_query';
// @ts-ignore
import { calculateRate } from '../calculate_rate';
// @ts-ignore
import { getDiffCalculation } from './_apm_stats';
import { LegacyRequest, ElasticsearchResponse, ElasticsearchResponseHit } from '../../types';

export function handleResponse(response: ElasticsearchResponse, start: number, end: number) {
  const initial = { ids: new Set(), beats: [] };
  const { beats } = response.hits?.hits.reduce((accum: any, hit: ElasticsearchResponseHit) => {
    const stats = hit._source.beats_stats;
    if (!stats) {
      return accum;
    }

    const earliestStats = hit.inner_hits.earliest.hits.hits[0]._source.beats_stats;
    if (!earliestStats) {
      return accum;
    }

    const uuid = stats?.beat?.uuid;

    // skip this duplicated beat, newer one was already added
    if (accum.ids.has(uuid)) {
      return accum;
    }
    // add another beat summary
    accum.ids.add(uuid);

    //  add the beat
    const rateOptions = {
      hitTimestamp: stats.timestamp,
      earliestHitTimestamp: earliestStats.timestamp,
      timeWindowMin: start,
      timeWindowMax: end,
    };

    const { rate: bytesSentRate } = calculateRate({
      latestTotal: stats.metrics?.libbeat?.output?.write?.bytes,
      earliestTotal: earliestStats?.metrics?.libbeat?.output?.write?.bytes,
      ...rateOptions,
    });

    const { rate: totalEventsRate } = calculateRate({
      latestTotal: stats.metrics?.libbeat?.pipeline?.events?.total,
      earliestTotal: earliestStats.metrics?.libbeat?.pipeline?.events?.total,
      ...rateOptions,
    });

    const errorsWrittenLatest = stats.metrics?.libbeat?.output?.write?.errors ?? 0;
    const errorsWrittenEarliest = earliestStats.metrics?.libbeat?.output?.write?.errors ?? 0;
    const errorsReadLatest = stats.metrics?.libbeat?.output?.read?.errors ?? 0;
    const errorsReadEarliest = earliestStats.metrics?.libbeat?.output?.read?.errors ?? 0;
    const errors = getDiffCalculation(
      errorsWrittenLatest + errorsReadLatest,
      errorsWrittenEarliest + errorsReadEarliest
    );

    accum.beats.push({
      uuid: stats.beat?.uuid,
      name: stats.beat?.name,
      type: upperFirst(stats.beat?.type),
      output: upperFirst(stats.metrics?.libbeat?.output?.type),
      total_events_rate: totalEventsRate,
      bytes_sent_rate: bytesSentRate,
      errors,
      memory: stats.metrics?.beat?.memstats?.memory_alloc,
      version: stats.beat?.version,
      time_of_last_event: hit._source.timestamp,
    });

    return accum;
  }, initial);

  return beats;
}

export async function getApms(req: LegacyRequest, apmIndexPattern: string, clusterUuid: string) {
  checkParam(apmIndexPattern, 'apmIndexPattern in getBeats');

  const config = req.server.config();
  const start = moment.utc(req.payload.timeRange.min).valueOf();
  const end = moment.utc(req.payload.timeRange.max).valueOf();

  const params = {
    index: apmIndexPattern,
    size: config.get('monitoring.ui.max_bucket_size'), // FIXME
    ignoreUnavailable: true,
    filterPath: [
      // only filter path can filter for inner_hits
      'hits.hits._source.timestamp',
      'hits.hits._source.beats_stats.beat.uuid',
      'hits.hits._source.beats_stats.beat.name',
      'hits.hits._source.beats_stats.beat.host',
      'hits.hits._source.beats_stats.beat.type',
      'hits.hits._source.beats_stats.beat.version',
      'hits.hits._source.beats_stats.metrics.libbeat.output.type',
      'hits.hits._source.beats_stats.metrics.libbeat.output.read.errors',
      'hits.hits._source.beats_stats.metrics.libbeat.output.write.errors',
      'hits.hits._source.beats_stats.metrics.beat.memstats.memory_alloc',

      // latest hits for calculating metrics
      'hits.hits._source.beats_stats.timestamp',
      'hits.hits._source.beats_stats.metrics.libbeat.output.write.bytes',
      'hits.hits._source.beats_stats.metrics.libbeat.pipeline.events.total',

      // earliest hits for calculating metrics
      'hits.hits.inner_hits.earliest.hits.hits._source.beats_stats.timestamp',
      'hits.hits.inner_hits.earliest.hits.hits._source.beats_stats.metrics.libbeat.output.write.bytes',
      'hits.hits.inner_hits.earliest.hits.hits._source.beats_stats.metrics.libbeat.pipeline.events.total',

      // earliest hits for calculating diffs
      'hits.hits.inner_hits.earliest.hits.hits._source.beats_stats.metrics.libbeat.output.read.errors',
      'hits.hits.inner_hits.earliest.hits.hits._source.beats_stats.metrics.libbeat.output.write.errors',
    ],
    body: {
      query: createApmQuery({
        start,
        end,
        clusterUuid,
      }),
      collapse: {
        field: 'beats_stats.metrics.beat.info.ephemeral_id', // collapse on ephemeral_id to handle restarts
        inner_hits: {
          name: 'earliest',
          size: 1,
          sort: [{ 'beats_stats.timestamp': { order: 'asc', unmapped_type: 'long' } }],
        },
      },
      sort: [
        { 'beats_stats.beat.uuid': { order: 'asc', unmapped_type: 'long' } }, // need to keep duplicate uuids grouped
        { timestamp: { order: 'desc', unmapped_type: 'long' } }, // need oldest timestamp to come first for rate calcs to work
      ],
    },
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  const response = await callWithRequest(req, 'search', params);

  return handleResponse(response, start, end);
}
