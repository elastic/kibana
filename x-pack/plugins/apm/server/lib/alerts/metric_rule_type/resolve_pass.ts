/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import util from 'util';
import {
  AverageAggregation,
  MaxAggregation,
  MinAggregation,
  SumAggregation,
} from '@elastic/elasticsearch/api/types';
import {
  mapValues,
  pickBy,
  uniq,
  omit,
  get,
  compact,
  isEmpty,
  chunk,
  flatten,
} from 'lodash';
import * as math from 'mathjs';
import {
  EVENT_KIND,
  TIMESTAMP,
} from '../../../../../rule_registry/common/technical_rule_data_field_names';
import { parseInterval } from '../../../../../../../src/plugins/data/common';
import { PromiseReturnType } from '../../../../../observability/typings/common';
import { RuleDataWriter } from '../../../../../rule_registry/server/';
import { isFiniteNumber } from '../../../../common/utils/is_finite_number';
import { arrayUnionToCallable } from '../../../../common/utils/array_union_to_callable';
import {
  countOverTimeRt,
  MetricAggregationConfig,
  metricExpressionRt,
  metricAggregationRt,
  Pass,
  Groups,
  MetricExpressionConfig,
  sumOverTimeRt,
  minOverTimeRt,
  maxOverTimeRt,
  avgOverTimeRt,
} from '../../../../common/rules/metric_config_rt';
import { kqlQuery, rangeQuery } from '../../../utils/queries';
import {
  alertingEsClient,
  AlertingScopedClusterClient,
} from '../alerting_es_client';
import { mergeByLabels } from './merge_by_labels';

const relaxedMath: typeof math = math.create(math.all) as any;

(relaxedMath.typed as any).conversions.unshift({
  from: 'null',
  to: 'number',
  convert: () => 0,
});

type MetricAggregation =
  | {
      avg: AverageAggregation;
    }
  | { min: MinAggregation }
  | { max: MaxAggregation }
  | { sum: SumAggregation };

function getResolver(name: string, metric: MetricAggregationConfig) {
  let aggregation: MetricAggregation | undefined;

  if (sumOverTimeRt.is(metric)) {
    aggregation = {
      sum: {
        field: metric.sum_over_time.field,
      },
    };
  } else if (minOverTimeRt.is(metric)) {
    aggregation = {
      min: {
        field: metric.min_over_time.field,
      },
    };
  } else if (maxOverTimeRt.is(metric)) {
    aggregation = {
      max: {
        field: metric.max_over_time.field,
      },
    };
  } else if (avgOverTimeRt.is(metric)) {
    aggregation = {
      avg: {
        field: metric.avg_over_time.field,
      },
    };
  } else if (countOverTimeRt.is(metric)) {
    aggregation = undefined;
  } else {
    const error = new Error('Unsupported metric aggregation type');
    Object.assign(error, metric);
    throw error;
  }

  const filter = metric.filter;

  if (filter) {
    return {
      path: aggregation ? `${name}.metric.value` : `${name}.doc_count`,
      aggregation: {
        filter: {
          bool: {
            filter: kqlQuery(filter),
          },
        },
        ...(aggregation
          ? {
              aggs: {
                metric: aggregation,
              },
            }
          : {}),
      },
    };
  }

  return {
    path: aggregation ? `${name}.value` : `doc_count`,
    aggregation,
  };
}

export async function resolvePass({
  groups,
  scopedClusterClient,
  ruleDataWriter,
  ruleExecutorData,
  pass,
  until,
}: {
  groups?: Groups;
  until: number;
  scopedClusterClient: AlertingScopedClusterClient;
  ruleDataWriter: RuleDataWriter;
  ruleExecutorData: RuleExecutorData;
  pass: Pass;
}) {
  const queryMetrics = pickBy(
    pass.metrics,
    (metric): metric is MetricAggregationConfig => {
      return metricAggregationRt.is(metric);
    }
  );

  const expressionMetrics = pickBy(
    pass.metrics,
    (metric): metric is MetricExpressionConfig => {
      return metricExpressionRt.is(metric);
    }
  );

  const expressions = mapValues(expressionMetrics, (metric) => {
    return {
      compiler: relaxedMath.compile(metric.expression),
      record: metric.record,
    };
  });

  const defaultQueryMetricValues = mapValues(queryMetrics, () => null);

  const ranges = uniq(
    Object.values(queryMetrics).map((metric) => {
      return metric.range;
    })
  );

  const metricsToRecord = new Set(
    Object.keys(pickBy(expressions, (value) => value.record))
  );

  const documents: Array<Record<string, any>> = [];

  const responses = await Promise.all(
    ranges.map(async (range) => {
      const metrics = pickBy(queryMetrics, (metric) => {
        return metric.range === range;
      });

      const to = until;
      const from = to - parseInterval(range)!.asMilliseconds();

      const resolvers = mapValues(metrics, (metric, name) => {
        return getResolver(name, metric);
      });

      const nonUndefinedMetricAggs = pickBy(
        mapValues(resolvers, (resolver) => {
          return resolver.aggregation;
        }),
        (agg): agg is Exclude<typeof agg, undefined> => {
          return !!agg;
        }
      );

      const metricAggs = isEmpty(nonUndefinedMetricAggs)
        ? undefined
        : nonUndefinedMetricAggs;

      const sourcesAsList = Object.entries(groups?.sources ?? []).map(
        ([name, source]) => {
          return {
            name,
            source,
          };
        }
      );

      const sources = sourcesAsList.map((source) => source.source);

      const response = await alertingEsClient({
        params: {
          index: pass.index,
          body: {
            _source: false,
            size: 0,
            query: {
              bool: {
                filter: [...rangeQuery(from, to), ...kqlQuery(pass.filter)],
              },
            },
            aggs: {
              ...(groups
                ? {
                    groups: {
                      multi_terms: {
                        terms: sources.map((source) => {
                          return {
                            field: source.field,
                            ...(source.missing ? ({ missing: '' } as {}) : {}),
                          };
                        }),
                        ...({ size: groups.limit ?? 25000 } as {}),
                      },
                      ...(metricAggs ? { aggs: metricAggs } : {}),
                    },
                  }
                : metricAggs ?? {}),
            },
          },
        },
        scopedClusterClient,
      });

      const { aggregations } = response;

      if (!aggregations && groups) {
        return undefined;
      }

      const buckets =
        aggregations &&
        'groups' in aggregations &&
        'buckets' in aggregations.groups
          ? aggregations.groups.buckets
          : [
              {
                doc_count: response.hits.total.value,
                ...omit(aggregations, 'groups'),
              },
            ];

      return arrayUnionToCallable(buckets).map((bucket) => {
        const aggregatedMetrics = mapValues(resolvers, ({ path }, key) => {
          const value = get(bucket, path);

          if (!isFiniteNumber(value) || value === null) {
            const error = new Error('Failed to locate metric in response');
            Object.assign({ key, path, bucket });
            throw error;
          }
          return value;
        });

        const labels =
          'key' in bucket
            ? Object.fromEntries(
                sourcesAsList.map((source, index) => [
                  source.name,
                  bucket.key[index],
                ])
              )
            : {};

        return {
          metrics: aggregatedMetrics,
          labels,
        };
      });
    })
  );

  const measurements = mergeByLabels(flatten(compact(responses)));

  measurements.forEach((measurement) => {
    const recorded: Record<string, any> = {};

    const scope = {
      ...defaultQueryMetricValues,
      ...measurement.metrics,
    };

    const evaluatedMetrics = mapValues(expressions, ({ compiler }) => {
      const value = compiler.evaluate(scope) as number | null;
      return value;
    });

    Object.assign(measurement.metrics, evaluatedMetrics);

    // eslint-disable-next-line guard-for-in
    for (const name in measurement.metrics) {
      const value = measurement.metrics[name];
      if (isFiniteNumber(value) && metricsToRecord.has(name)) {
        recorded[name] = value;
      }
    }

    if (!isEmpty(recorded)) {
      documents.push({
        ...ruleExecutorData,
        ...recorded,
        ...measurement.labels,
        [TIMESTAMP]: until,
        [EVENT_KIND]: 'metric',
      });
    }
  });

  if (documents.length) {
    const chunks = chunk(documents, 1000);

    for (const batch of chunks) {
      await ruleDataWriter.bulk({
        body: batch.flatMap((doc) => [{ index: {} }, doc]),
      });
    }
  }

  return flatten(compact(responses));
}

export type PassResponse = PromiseReturnType<typeof resolvePass>;
