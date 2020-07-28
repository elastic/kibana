/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import boom from 'boom';
import { get } from 'lodash';
import { checkParam } from '../error_missing_required';
import { getPipelineStateDocument } from './get_pipeline_state_document';
import { getPipelineVertexStatsAggregation } from './get_pipeline_vertex_stats_aggregation';
import { calculateTimeseriesInterval } from '../calculate_timeseries_interval';

export function _vertexStats(
  vertex,
  vertexStatsBucket,
  totalProcessorsDurationInMillis,
  timeseriesIntervalInSeconds
) {
  const isInput = vertex.plugin_type === 'input';
  const isProcessor = vertex.plugin_type === 'filter' || vertex.plugin_type === 'output';

  const timeseriesIntervalInMillis = timeseriesIntervalInSeconds * 1000;

  const eventsInTotal = vertexStatsBucket.events_in_total.value;
  const eventsOutTotal = get(vertexStatsBucket, 'events_out_total.value', null);

  const durationInMillis = vertexStatsBucket.duration_in_millis_total.value;

  const inputStats = {};
  const processorStats = {};
  const eventsProcessedStats = {
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
  stateDocument,
  vertexStatsAggregation,
  vertexId,
  timeseriesIntervalInSeconds
) {
  const logstashState = stateDocument.logstash_state;
  const vertices = logstashState.pipeline.representation.graph.vertices;

  // First, filter out the vertex we care about
  const vertex = vertices.find((v) => v.id === vertexId);
  vertex.stats = {};

  // Next, iterate over timeseries metrics and attach them to vertex
  const timeSeriesBuckets = vertexStatsAggregation.aggregations.timeseries.buckets;
  timeSeriesBuckets.forEach((timeSeriesBucket) => {
    // each bucket calculates stats for total pipeline CPU time for the associated timeseries
    const totalDurationStats = timeSeriesBucket.pipelines.scoped.total_processor_duration_stats;
    const totalProcessorsDurationInMillis = totalDurationStats.max - totalDurationStats.min;

    const timestamp = timeSeriesBucket.key;

    const vertexStatsBucket = timeSeriesBucket.pipelines.scoped.vertices.vertex_id;
    const vertexStats = _vertexStats(
      vertex,
      vertexStatsBucket,
      totalProcessorsDurationInMillis,
      timeseriesIntervalInSeconds
    );
    Object.keys(vertexStats).forEach((stat) => {
      if (!vertex.stats.hasOwnProperty(stat)) {
        vertex.stats[stat] = { data: [] };
      }
      vertex.stats[stat].data.push([timestamp, vertexStats[stat]]);
    });
  });

  return vertex;
}

export async function getPipelineVertex(
  req,
  config,
  lsIndexPattern,
  clusterUuid,
  pipelineId,
  version,
  vertexId
) {
  checkParam(lsIndexPattern, 'lsIndexPattern in getPipeline');

  const options = {
    clusterUuid,
    pipelineId,
    version,
    vertexId,
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
    getPipelineVertexStatsAggregation(req, lsIndexPattern, timeseriesInterval, options),
  ]);

  if (stateDocument === null) {
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
