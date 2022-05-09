/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import boom from '@hapi/boom';
import { get } from 'lodash';
import { getPipelineStateDocument } from './get_pipeline_state_document';
import { getPipelineVertexStatsAggregation } from './get_pipeline_vertex_stats_aggregation';
import { calculateTimeseriesInterval } from '../calculate_timeseries_interval';
import { LegacyRequest, PipelineVersion } from '../../types';
import {
  ElasticsearchSource,
  ElasticsearchSourceLogstashPipelineVertex,
} from '../../../common/types/es';
import { MonitoringConfig } from '../../config';

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

  const inputStats: any = {};
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
    inputStats.queue_push_duration_in_millis =
      vertexStatsBucket.queue_push_duration_in_millis_total.value;
    inputStats.queue_push_duration_in_millis_per_event =
      inputStats.queue_push_duration_in_millis / eventsTotal;
  }

  if (isProcessor) {
    eventsTotal = eventsInTotal;
    processorStats.percent_of_total_processor_duration =
      durationInMillis / totalProcessorsDurationInMillis;
    eventsProcessedStats.events_in_per_millisecond = eventsInTotal / timeseriesIntervalInMillis;
  }

  return {
    events_in: eventsInTotal,
    events_out: eventsOutTotal,
    duration_in_millis: durationInMillis,
    millis_per_event: durationInMillis / eventsTotal,
    ...inputStats,
    ...processorStats,
    ...eventsProcessedStats,
  };
}

/**
 * The UI needs a list of all vertices for the requested pipeline version, with each vertex in the list having its timeseries metrics associated with it. The
 * stateDocument object provides the list of vertices while the statsAggregation object provides the timeseries metrics for each of these vertices.
 * This function stitches the two together and returns the modified stateDocument object.
 *
 * @param {Object} stateDocument
 * @param {Object} vertexStatsAggregation
 * @param {Object} First and last seen timestamps for pipeline version we're getting data for
 * @param {Integer} timeseriesIntervalInSeconds The size of each timeseries bucket, in seconds
 */
export function _enrichVertexStateWithStatsAggregation(
  stateDocument: ElasticsearchSource,
  vertexStatsAggregation: any,
  vertexId: string,
  timeseriesIntervalInSeconds: number
) {
  const logstashState = stateDocument.logstash?.node?.state || stateDocument.logstash_state;
  const vertices = logstashState?.pipeline?.representation?.graph?.vertices;

  // First, filter out the vertex we care about
  const vertex = vertices?.find((v) => v.id === vertexId);
  if (vertex) {
    vertex.stats = {};
  }

  // Next, iterate over timeseries metrics and attach them to vertex
  const timeSeriesBuckets = vertexStatsAggregation.aggregations?.timeseries.buckets ?? [];
  timeSeriesBuckets.forEach((timeSeriesBucket: any) => {
    // each bucket calculates stats for total pipeline CPU time for the associated timeseries.
    // we could have data in both legacy and metricbeat collection, we pick the bucket most filled
    const bucketCount = (aggregationKey: string) =>
      get(timeSeriesBucket, `${aggregationKey}.scoped.total_processor_duration_stats.count`);

    const pipelineBucket =
      bucketCount('pipelines_mb') > bucketCount('pipelines')
        ? timeSeriesBucket.pipelines_mb
        : timeSeriesBucket.pipelines;
    const totalDurationStats = pipelineBucket.scoped.total_processor_duration_stats;
    const totalProcessorsDurationInMillis = totalDurationStats.max - totalDurationStats.min;

    const timestamp = timeSeriesBucket.key;

    const vertexStatsBucket = pipelineBucket.scoped.vertices.vertex_id;
    if (vertex) {
      const vertexStats = _vertexStats(
        vertex,
        vertexStatsBucket,
        totalProcessorsDurationInMillis,
        timeseriesIntervalInSeconds
      );
      Object.keys(vertexStats).forEach((stat) => {
        if (vertex?.stats) {
          if (!vertex.stats.hasOwnProperty(stat)) {
            vertex.stats[stat] = { data: [] };
          }
          vertex.stats[stat].data?.push([timestamp, vertexStats[stat]]);
        }
      });
    }
  });

  return vertex;
}

export async function getPipelineVertex(
  req: LegacyRequest,
  config: MonitoringConfig,
  clusterUuid: string,
  pipelineId: string,
  version: PipelineVersion,
  vertexId: string
) {
  // Determine metrics' timeseries interval based on version's timespan
  const minIntervalSeconds = Math.max(config.ui.min_interval_seconds, 30);
  const timeseriesInterval = calculateTimeseriesInterval(
    Number(version.firstSeen),
    Number(version.lastSeen),
    Number(minIntervalSeconds)
  );

  const [stateDocument, statsAggregation] = await Promise.all([
    getPipelineStateDocument({
      req,
      clusterUuid,
      pipelineId,
      version,
    }),
    getPipelineVertexStatsAggregation({
      req,
      timeSeriesIntervalInSeconds: timeseriesInterval,
      clusterUuid,
      pipelineId,
      version,
      vertexId,
    }),
  ]);

  if (stateDocument === null || !statsAggregation) {
    return boom.notFound(
      `Pipeline [${pipelineId} @ ${version.hash}] not found in the selected time range for cluster [${clusterUuid}].`
    );
  }

  return _enrichVertexStateWithStatsAggregation(
    stateDocument,
    statsAggregation,
    vertexId,
    timeseriesInterval
  );
}
