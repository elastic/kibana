/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import boom from '@hapi/boom';
import { get } from 'lodash';
import { getPipelineStateDocument } from './get_pipeline_state_document';
import { getPipelineStatsAggregation } from './get_pipeline_stats_aggregation';
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
  // we could have data in both legacy and metricbeat collection, we pick the bucket most filled
  const bucketCount = (aggregationKey: string) =>
    get(
      statsAggregation.aggregations,
      `${aggregationKey}.scoped.total_processor_duration_stats.count`
    );

  const pipelineBucket =
    bucketCount('pipelines_mb') > bucketCount('pipelines')
      ? statsAggregation.aggregations.pipelines_mb
      : statsAggregation.aggregations.pipelines;
  const logstashState = stateDocument.logstash_state || stateDocument.logstash?.node?.state;
  const vertices = logstashState?.pipeline?.representation?.graph?.vertices ?? [];

  const verticesById: any = {};
  vertices.forEach((vertex) => {
    verticesById[vertex.id] = vertex;
    vertex.stats = {};
  });

  const totalDurationStats = pipelineBucket.scoped.total_processor_duration_stats;
  const totalProcessorsDurationInMillis = totalDurationStats.max - totalDurationStats.min;

  const verticesWithStatsBuckets = pipelineBucket.scoped.vertices?.vertex_id.buckets ?? [];
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

  return logstashState?.pipeline;
}

export async function getPipeline(
  req: LegacyRequest,
  config: MonitoringConfig,
  clusterUuid: string,
  pipelineId: string,
  version: PipelineVersion
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
    getPipelineStatsAggregation({
      req,
      timeseriesInterval,
      clusterUuid,
      pipelineId,
      version,
    }),
  ]);

  if (stateDocument === null || !statsAggregation) {
    return boom.notFound(
      `Pipeline [${pipelineId} @ ${version.hash}] not found in the selected time range for cluster [${clusterUuid}].`
    );
  }

  return _enrichStateWithStatsAggregation(stateDocument, statsAggregation, timeseriesInterval);
}
