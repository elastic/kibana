/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import boom from 'boom';
import { get } from 'lodash';
import { checkParam } from '../error_missing_required';
import { getPipelineStateDocument } from './get_pipeline_state_document';
import { getPipelineStatsAggregation } from './get_pipeline_stats_aggregation';
import { getPipelineVersions } from './get_pipeline_versions';
import { calculateTimeseriesInterval } from '../calculate_timeseries_interval';

export function _vertexStats(vertex, vertexStatsBucket, totalProcessorsDurationInMillis, timeseriesIntervalInSeconds) {

  const isInput = vertex.plugin_type === 'input';
  const isProcessor = vertex.plugin_type === 'filter' || vertex.plugin_type === 'output';

  const eventsInTotal = vertexStatsBucket.events_in_total.value;
  const eventsOutTotal = get(vertexStatsBucket, 'events_out_total.value', null);

  const durationInMillis = vertexStatsBucket.duration_in_millis_total.value;

  const inputStats = {};
  const processorStats = {};

  let eventsTotal;

  if (isInput) {
    eventsTotal = eventsOutTotal;
    inputStats.queue_push_duration_in_millis = vertexStatsBucket.queue_push_duration_in_millis_total.value;
    inputStats.queue_push_duration_in_millis_per_event = inputStats.queue_push_duration_in_millis / eventsTotal;
  }

  if (isProcessor) {
    eventsTotal = eventsInTotal;
    processorStats.percent_of_total_processor_duration = durationInMillis / totalProcessorsDurationInMillis;
  }

  return {
    events_in: eventsInTotal,
    events_out: eventsOutTotal,
    duration_in_millis: durationInMillis,
    events_per_millisecond: eventsTotal / (timeseriesIntervalInSeconds * 1000),
    millis_per_event: durationInMillis / eventsTotal,
    ...inputStats,
    ...processorStats
  };
}

/**
 * The UI needs a list of all vertices for the requested pipeline version, with each vertex in the list having its timeseries metrics associated with it. The
 * stateDocument object provides the list of vertices while the statsAggregation object provides timeseries metrics. This function stithces the two together
 * and returns the modified stateDocument object.
 *
 * @param {Object} stateDocument
 * @param {Object} statsAggregation
 * @param {Object} First and last seen timestamps for pipeline version we're getting data for
 * @param {Integer} timeseriesIntervalInSeconds The size of each timeseries bucket, in seconds
 */
export function _enrichStateWithStatsAggregation(stateDocument, statsAggregation, { firstSeen, lastSeen }, timeseriesIntervalInSeconds) {
  const logstashState = stateDocument.logstash_state;
  const vertices = logstashState.pipeline.representation.graph.vertices;

  const verticesById = {};
  vertices.forEach(vertex => {
    verticesById[vertex.id] = vertex;
    vertex.stats = {};
  });

  // The statsAggregation object buckets by time first, then by vertex ID. However, the logstashState object (which is part of the
  // stateDocument object) buckets by vertex ID first. The UI desires the latter structure so it can look up stats by vertex. So we
  // transpose statsAggregation to bucket by vertex ID first, then by time. This then allows us to stitch the per-vertex timeseries stats
  // from the transposed statsAggregation object onto the logstashState object.
  const timeseriesBuckets = statsAggregation.timeseriesStats;
  timeseriesBuckets.forEach(timeseriesBucket => {
    // each bucket calculates stats for total pipeline CPU time for the associated timeseries
    const totalDurationStats = timeseriesBucket.pipelines.scoped.total_processor_duration_stats;
    const totalProcessorsDurationInMillis = totalDurationStats.max - totalDurationStats.min;

    // Each timeseriesBucket contains a list of vertices and their stats for a single timeseries interval
    const timestamp = timeseriesBucket.key.time_bucket;
    const vertexStatsByIdBuckets = get(timeseriesBucket, 'pipelines.scoped.vertices.vertex_id.buckets', []);

    vertexStatsByIdBuckets.forEach(vertexStatsBucket => {
      // Each vertexStats bucket contains a list of stats for a single vertex within a single timeseries interval
      const vertexId = vertexStatsBucket.key;
      const vertex = verticesById[vertexId];

      if (vertex !== undefined) {
        // We extract this vertex's stats from vertexStatsBucket
        const vertexStats = _vertexStats(vertex, vertexStatsBucket, totalProcessorsDurationInMillis, timeseriesIntervalInSeconds);

        // For each stat (metric), we add it to the stats property of the vertex object in logstashState
        const metrics = Object.keys(vertexStats);
        metrics.forEach(metric => {
          // Create metric object if it doesn't already exist
          if (!vertex.stats.hasOwnProperty(metric)) {
            vertex.stats[metric] = {
              timeRange: {
                min: firstSeen,
                max: lastSeen
              },
              data: []
            };
          }

          vertex.stats[metric].data.push([ timestamp, vertexStats[metric]]);
        });
      }
    });
  });

  return stateDocument.logstash_state;
}

export async function getPipeline(req, config, lsIndexPattern, clusterUuid, pipelineId, pipelineHash) {
  checkParam(lsIndexPattern, 'lsIndexPattern in getPipeline');

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  const versions = await getPipelineVersions(callWithRequest, req, config, lsIndexPattern, clusterUuid, pipelineId);

  let version;
  if (pipelineHash) {
    // Find version corresponding to given hash
    version = versions.find(({ hash }) => hash === pipelineHash);
  } else {
    // Go with latest version
    version = versions[0];
  }

  const options = {
    clusterUuid,
    pipelineId,
    version
  };

  // Determine metrics' timeseries interval based on version's timespan
  const minIntervalSeconds = config.get('xpack.monitoring.min_interval_seconds');
  const timeseriesInterval = calculateTimeseriesInterval(version.firstSeen, version.lastSeen, minIntervalSeconds);

  const [ stateDocument, statsAggregation ] = await Promise.all([
    getPipelineStateDocument(callWithRequest, req, lsIndexPattern, options),
    getPipelineStatsAggregation(callWithRequest, req, lsIndexPattern, timeseriesInterval, options)
  ]);

  if (stateDocument === null) {
    return boom.notFound(`Pipeline [${pipelineId} @ ${version.hash}] not found in the selected time range for cluster [${clusterUuid}].`);
  }

  const result = {
    ..._enrichStateWithStatsAggregation(stateDocument, statsAggregation, version, timeseriesInterval),
    versions
  };
  return result;
}
