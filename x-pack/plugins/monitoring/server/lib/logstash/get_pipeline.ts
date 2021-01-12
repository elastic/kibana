/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import boom from '@hapi/boom';
import { get } from 'lodash';
// @ts-ignore
import { checkParam } from '../error_missing_required';
import { getPipelineStateDocument } from './get_pipeline_state_document';
// @ts-ignore
import { getPipelineStatsAggregation } from './get_pipeline_stats_aggregation';
// @ts-ignore
import { calculateTimeseriesInterval } from '../calculate_timeseries_interval';
import { LegacyRequest } from '../../types';
import {
  ElasticsearchSource,
  ElasticsearchSourceLogstashPipelineVertex,
} from '../../../common/types/es';

export function _vertexStats(
  vertex: ElasticsearchSourceLogstashPipelineVertex,
  vertexStatsBucket: any,
  totalProcessorsDurationInMillis: number,
  timeseriesIntervalInSeconds: number
) {
  const isInput = vertex.plugin_type === 'input';
  const isProcessor = vertex.plugin_type === 'filter' || vertex.plugin_type === 'output';

  const timeseriesIntervalInMillis = timeseriesIntervalInSeconds * 1000;

  const eventsInTotal = vertexStatsBucket.events_in_total.value;
  const eventsOutTotal = get(vertexStatsBucket, 'events_out_total.value', null);

  const durationInMillis = vertexStatsBucket.duration_in_millis_total.value;

  const processorStats: any = {};
  const eventsProcessedStats: {
    events_out_per_millisecond: number;
    events_in_per_millisecond?: number;
  } = {
    events_out_per_millisecond: eventsOutTotal / timeseriesIntervalInMillis,
  };

  let eventsTotal;

  if (isInput) {
    eventsTotal = eventsOutTotal;
  }

  if (isProcessor) {
    eventsTotal = eventsInTotal;
    processorStats.percent_of_total_processor_duration =
      durationInMillis / totalProcessorsDurationInMillis;
    eventsProcessedStats.events_in_per_millisecond = eventsInTotal / timeseriesIntervalInMillis;
  }

  return {
    millis_per_event: durationInMillis / eventsTotal,
    ...processorStats,
    ...eventsProcessedStats,
  };
}

/**
 * The UI needs a list of all vertices for the requested pipeline version, with each vertex in the list having its timeseries metrics associated with it. The
 * stateDocument object provides the list of vertices while the statsAggregation object provides the latest metrics for each of these vertices.
 * This function stitches the two together and returns the modified stateDocument object.
 *
 * @param {Object} stateDocument
 * @param {Object} statsAggregation
 * @param {Object} First and last seen timestamps for pipeline version we're getting data for
 * @param {Integer} timeseriesIntervalInSeconds The size of each timeseries bucket, in seconds
 */
export function _enrichStateWithStatsAggregation(
  stateDocument: ElasticsearchSource,
  statsAggregation: any,
  timeseriesIntervalInSeconds: number
) {
  const logstashState = stateDocument.logstash_state;
  const vertices = logstashState?.pipeline?.representation?.graph?.vertices ?? [];

  const verticesById: any = {};
  vertices.forEach((vertex) => {
    verticesById[vertex.id] = vertex;
    vertex.stats = {};
  });

  const totalDurationStats =
    statsAggregation.aggregations.pipelines.scoped.total_processor_duration_stats;
  const totalProcessorsDurationInMillis = totalDurationStats.max - totalDurationStats.min;

  const verticesWithStatsBuckets =
    statsAggregation.aggregations.pipelines.scoped.vertices.vertex_id.buckets;
  verticesWithStatsBuckets.forEach((vertexStatsBucket: any) => {
    // Each vertexStats bucket contains a list of stats for a single vertex within a single timeseries interval
    const vertexId = vertexStatsBucket.key;
    const vertex = verticesById[vertexId];

    if (vertex !== undefined) {
      // We extract this vertex's stats from vertexStatsBucket
      vertex.stats = _vertexStats(
        vertex,
        vertexStatsBucket,
        totalProcessorsDurationInMillis,
        timeseriesIntervalInSeconds
      );
    }
  });

  return stateDocument.logstash_state?.pipeline;
}

export async function getPipeline(
  req: LegacyRequest,
  config: { get: (key: string) => string | undefined },
  lsIndexPattern: string,
  clusterUuid: string,
  pipelineId: string,
  version: { firstSeen: string; lastSeen: string; hash: string }
) {
  checkParam(lsIndexPattern, 'lsIndexPattern in getPipeline');

  const options: any = {
    clusterUuid,
    pipelineId,
    version,
  };

  // Determine metrics' timeseries interval based on version's timespan
  const minIntervalSeconds = config.get('monitoring.ui.min_interval_seconds');
  const timeseriesInterval = calculateTimeseriesInterval(
    version.firstSeen,
    version.lastSeen,
    minIntervalSeconds
  );

  const [stateDocument, statsAggregation] = await Promise.all([
    getPipelineStateDocument(req, lsIndexPattern, options),
    getPipelineStatsAggregation(req, lsIndexPattern, timeseriesInterval, options),
  ]);

  if (stateDocument === null) {
    return boom.notFound(
      `Pipeline [${pipelineId} @ ${version.hash}] not found in the selected time range for cluster [${clusterUuid}].`
    );
  }

  return _enrichStateWithStatsAggregation(stateDocument, statsAggregation, timeseriesInterval);
}
