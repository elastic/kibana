/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, cloneDeep, last } from 'lodash';
import { filter } from '../pagination/filter';
import { getLogstashPipelineIds } from './get_pipeline_ids';
import { sortPipelines } from './sort_pipelines';
import { paginate } from '../pagination/paginate';
import { getMetrics } from '../details/get_metrics';
import {
  LegacyRequest,
  Pipeline,
  PipelineMetricKey,
  PipelineMetricsRes,
  PipelineNodeCountMetricKey,
  PipelinesResponse,
  PipelineThroughputMetricKey,
  PipelineWithMetrics,
} from '../../types';

/**
 * This function performs an optimization around the pipeline listing tables in the UI. To avoid
 * query performances in Elasticsearch (mainly thinking of `search.max_buckets` overflows), we do
 * not want to fetch all time-series data for all pipelines. Instead, we only want to fetch the
 * time-series data for the pipelines visible in the listing table. This function accepts
 * pagination/sorting/filtering data to determine which pipelines will be visible in the table
 * and returns that so the caller can perform their normal call to get the time-series data.
 *
 * @param {*} req - Server request object
 * @param {*} lsIndexPattern - The index pattern to search against (`.monitoring-logstash-*`)
 * @param {*} clusterUuid -  clusterUuid to filter the results from
 * @param {*} logstashUuid -  logstashUuid to filter the results from
 * @param {*} metrics - The array of metrics that are sortable in the UI
 * @param {*} pagination - ({ index, size })
 * @param {*} sort - ({ field, direction })
 * @param {*} queryText - Text that will be used to filter out pipelines
 */

interface GetPaginatedPipelinesParams {
  req: LegacyRequest;
  clusterUuid: string;
  logstashUuid?: string;
  metrics: {
    throughputMetric: PipelineThroughputMetricKey;
    nodesCountMetric: PipelineNodeCountMetricKey;
  };
  pagination: { index: number; size: number };
  sort: { field: PipelineMetricKey | ''; direction: 'asc' | 'desc' };
  queryText: string;
}
export async function getPaginatedPipelines({
  req,
  clusterUuid,
  logstashUuid,
  metrics,
  pagination,
  sort = { field: '', direction: 'desc' },
  queryText,
}: GetPaginatedPipelinesParams) {
  const { throughputMetric, nodesCountMetric } = metrics;
  const sortField = sort.field;
  const config = req.server.config;
  const size = config.ui.max_bucket_size;
  let pipelines = await getLogstashPipelineIds({
    req,
    clusterUuid,
    logstashUuid,
    size,
  });
  // this is needed for sorting
  if (sortField === throughputMetric) {
    pipelines = await getPaginatedThroughputData(pipelines, req, throughputMetric);
  } else if (sortField === nodesCountMetric) {
    pipelines = await getPaginatedNodesData(pipelines, req, nodesCountMetric);
  }

  const filteredPipelines = filter(pipelines, queryText, ['id']); // We only support filtering by id right now

  const sortedPipelines = sortPipelines(filteredPipelines, sort);

  const pageOfPipelines = paginate(pagination, sortedPipelines);

  const response = {
    pipelines: await getPipelines({
      req,
      pipelines: pageOfPipelines,
      throughputMetric,
      nodesCountMetric,
    }),
    totalPipelineCount: filteredPipelines.length,
  };

  return processPipelinesAPIResponse(response, throughputMetric, nodesCountMetric);
}

function processPipelinesAPIResponse(
  response: { pipelines: PipelineWithMetrics[]; totalPipelineCount: number },
  throughputMetricKey: PipelineThroughputMetricKey,
  nodeCountMetricKey: PipelineNodeCountMetricKey
) {
  // Normalize metric names for shared component code
  // Calculate latest throughput and node count for each pipeline
  const processedResponse = response.pipelines.reduce<PipelinesResponse>(
    (acc, pipeline) => {
      acc.pipelines.push({
        ...pipeline,
        metrics: {
          throughput: pipeline.metrics[throughputMetricKey],
          nodesCount: pipeline.metrics[nodeCountMetricKey],
        },
        latestThroughput: (last(pipeline.metrics[throughputMetricKey]?.data) || [])[1],
        latestNodesCount: (last(pipeline.metrics[nodeCountMetricKey]?.data) || [])[1],
      });
      return acc;
    },
    { totalPipelineCount: response.totalPipelineCount, pipelines: [] }
  );

  return processedResponse;
}

async function getPaginatedThroughputData(
  pipelines: Pipeline[],
  req: LegacyRequest,
  throughputMetric: PipelineThroughputMetricKey
): Promise<Pipeline[]> {
  const dataset = 'node_stats';
  const moduleType = 'logstash';
  const metricSeriesData: any = Object.values(
    await Promise.all(
      pipelines.map((pipeline) => {
        return new Promise(async (resolve, reject) => {
          try {
            const data = await getMetrics(
              req,
              moduleType,
              [throughputMetric],
              [
                {
                  bool: {
                    should: [
                      { term: { 'data_stream.dataset': `${moduleType}.${dataset}` } },
                      { term: { 'metricset.name': dataset } },
                      {
                        term: {
                          type: 'logstash_stats',
                        },
                      },
                    ],
                  },
                },
              ],
              {
                pipeline,
              },
              2
            );
            resolve(reduceData(pipeline, data));
          } catch (error) {
            reject(error);
          }
        });
      })
    )
  );
  return pipelines.reduce<Pipeline[]>((acc, pipeline) => {
    const match = metricSeriesData.find((metric: { id: string }) => metric.id === pipeline.id);
    if (match) {
      const dataSeries = get(match, `metrics.${throughputMetric}.data`, [[]]);
      if (dataSeries.length) {
        const newPipeline = {
          ...pipeline,
          [throughputMetric]: dataSeries.pop()[1],
        };
        acc.push(newPipeline);
      } else {
        acc.push(pipeline);
      }
    } else {
      acc.push(pipeline);
    }
    return acc;
  }, []);
}

async function getPaginatedNodesData(
  pipelines: Pipeline[],
  req: LegacyRequest,
  nodesCountMetric: PipelineNodeCountMetricKey
): Promise<Pipeline[]> {
  const dataset = 'node_stats';
  const moduleType = 'logstash';
  const pipelineWithMetrics = cloneDeep(pipelines);
  const metricSeriesData = await getMetrics(
    req,
    moduleType,
    [nodesCountMetric],
    [
      {
        bool: {
          should: [
            { term: { 'data_stream.dataset': `${moduleType}.${dataset}` } },
            { term: { 'metricset.name': dataset } },
            { term: { type: 'logstash_stats' } },
          ],
        },
      },
    ],
    { pageOfPipelines: pipelineWithMetrics },
    2
  );
  const { data } = metricSeriesData[nodesCountMetric][0] || [[]];
  const pipelinesMap = (data.pop() || [])[1] || {};
  if (!Object.keys(pipelinesMap).length) {
    return pipelineWithMetrics;
  }
  return pipelineWithMetrics.map((pipeline) => ({
    ...pipeline,
    [nodesCountMetric]: pipelinesMap[pipeline.id],
  }));
}

async function getPipelines({
  req,
  pipelines,
  throughputMetric,
  nodesCountMetric,
}: {
  req: LegacyRequest;
  pipelines: Pipeline[];
  throughputMetric: PipelineThroughputMetricKey;
  nodesCountMetric: PipelineNodeCountMetricKey;
}): Promise<PipelineWithMetrics[]> {
  const throughputPipelines = await getThroughputPipelines(req, pipelines, throughputMetric);
  const nodeCountPipelines = await getNodePipelines(req, pipelines, nodesCountMetric);
  const finalPipelines = pipelines.map(({ id }) => {
    const matchThroughputPipeline = throughputPipelines.find((p) => p.id === id);
    const matchNodesCountPipeline = nodeCountPipelines.find((p) => p.id === id);
    return {
      id,
      metrics: {
        [throughputMetric]:
          matchThroughputPipeline && throughputMetric in matchThroughputPipeline.metrics
            ? matchThroughputPipeline.metrics[throughputMetric]
            : undefined,
        [nodesCountMetric]:
          matchNodesCountPipeline && nodesCountMetric in matchNodesCountPipeline.metrics
            ? matchNodesCountPipeline.metrics[nodesCountMetric]
            : undefined,
      },
    };
  });
  return finalPipelines;
}

async function getThroughputPipelines(
  req: LegacyRequest,
  pipelines: Pipeline[],
  throughputMetric: string
): Promise<PipelineWithMetrics[]> {
  const dataset = 'node_stats';
  const moduleType = 'logstash';
  const metricsResponse = await Promise.all(
    pipelines.map((pipeline) => {
      return new Promise(async (resolve, reject) => {
        try {
          const data = await getMetrics(
            req,
            moduleType,
            [throughputMetric],
            [
              {
                bool: {
                  should: [
                    { term: { 'data_stream.dataset': `${moduleType}.${dataset}` } },
                    { term: { 'metricset.name': dataset } },
                    {
                      term: {
                        type: 'logstash_stats',
                      },
                    },
                  ],
                },
              },
            ],
            {
              pipeline,
            }
          );
          resolve(reduceData(pipeline, data));
        } catch (error) {
          reject(error);
        }
      });
    })
  );
  return Object.values(metricsResponse) as PipelineWithMetrics[];
}

async function getNodePipelines(
  req: LegacyRequest,
  pipelines: Pipeline[],
  nodesCountMetric: string
): Promise<PipelineWithMetrics[]> {
  const moduleType = 'logstash';
  const dataset = 'node_stats';
  const metricData = await getMetrics(
    req,
    moduleType,
    [nodesCountMetric],
    [
      {
        bool: {
          should: [
            { term: { 'data_stream.dataset': `${moduleType}.${dataset}` } },
            { term: { 'metricset.name': dataset } },
            { term: { type: 'logstash_stats' } },
          ],
        },
      },
    ],
    {
      pageOfPipelines: pipelines,
    }
  );

  const metricObject = metricData[nodesCountMetric][0] as PipelineMetricsRes;
  const pipelinesData = pipelines.map(({ id }) => {
    return {
      id,
      metrics: {
        [nodesCountMetric]: {
          ...metricObject,
          data: metricObject.data.map(([timestamp, valueMap]) => [timestamp, valueMap[id]]),
        },
      },
    };
  });

  return pipelinesData;
}

function reduceData(pipeline: Pipeline, data: any) {
  return {
    id: pipeline.id,
    metrics: Object.keys(data).reduce<any>((accum, metricName) => {
      accum[metricName] = data[metricName][0];
      return accum;
    }, {}),
  };
}
