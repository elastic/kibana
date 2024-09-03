/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient, Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { withoutOutputUpdateEvents, type InferenceClient } from '@kbn/inference-plugin/server';
import {
  ObservabilityElasticsearchClient,
  createObservabilityEsClient,
} from '@kbn/observability-utils/es/client/create_observability_es_client';
import moment from 'moment';
import { Observable, lastValueFrom } from 'rxjs';
import { Metric, MetricDefinition } from '../../../common/metrics';
import { sortAndTruncateAnalyzedFields } from '../../../common/utils/sort_and_truncate_analyzed_fields';
import { mergeSampleDocumentsWithFieldCaps } from '../../util/merge_sample_documents_with_field_caps';
import { getSampleDocuments } from '../get_sample_documents';
import { StepProcess, runSteps } from '../run_steps';

async function getKeywordAndNumericalFields({
  indexPatterns,
  esClient,
  start,
  end,
}: {
  indexPatterns: string[];
  esClient: ObservabilityElasticsearchClient;
  start: number;
  end: number;
}): Promise<Array<{ name: string; esTypes: string[] }>> {
  const fieldCaps = await esClient.client.fieldCaps({
    index: indexPatterns,
    fields: '*',
    include_empty_fields: false,
    types: [
      'constant_keyword',
      'keyword',
      'integer',
      'long',
      'double',
      'float',
      'byte',
      'boolean',
      'alias',
      'flattened',
      'ip',
      'aggregate_metric_double',
      'histogram',
    ],
    // index_filter: {
    //   bool: {
    //     filter: [...excludeFrozenQuery(), ...rangeQuery(start, end)],
    //   },
    // },
  });

  return Object.entries(fieldCaps.fields).map(([fieldName, fieldSpec]) => {
    return {
      name: fieldName,
      esTypes: Object.keys(fieldSpec),
    };
  });
}

export type ExtractMetricDefinitionProcess = StepProcess<
  {
    fetching_field_caps: { label: string };
    fetching_sample_documents: { label: string };
    extracting_metric_definitions: { label: string };
  },
  MetricDefinition[]
>;

export function extractMetricDefinitions({
  indexPatterns,
  inferenceClient,
  esClient,
  logger,
  connectorId,
}: {
  indexPatterns: string[];
  inferenceClient: InferenceClient;
  esClient: IScopedClusterClient;
  logger: Logger;
  connectorId: string;
}): Observable<ExtractMetricDefinitionProcess> {
  return runSteps(
    {
      fetching_field_caps: {
        label: i18n.translate(
          'xpack.inventory.datasets.extractMetricDefinitionStep.fetchingFields',
          {
            defaultMessage: 'Fetching field capabilities',
          }
        ),
      },
      fetching_sample_documents: {
        label: i18n.translate(
          'xpack.inventory.datasets.extractMetricDefinitionStep.fetchingSampleDocuments',
          {
            defaultMessage: 'Fetching sample documents',
          }
        ),
      },
      extracting_constant_keywords: {
        label: i18n.translate(
          'xpack.inventory.datasets.extractMetricDefinitionStep.extractingConstantKeywords',
          {
            defaultMessage: 'Extracting constants',
          }
        ),
      },
      describe_dataset: {
        label: i18n.translate(
          'xpack.inventory.datasets.extractMetricDefinitionStep.describingDataset',
          {
            defaultMessage: 'Describing dataset',
          }
        ),
      },
      extracting_metric_definitions: {
        label: i18n.translate(
          'xpack.inventory.datasets.extractMetricDefinitionStep.extractingMetricDefinitions',
          {
            defaultMessage: 'Extracting metric definitions',
          }
        ),
      },
    },
    async ({ step }) => {
      const obsEsClient = createObservabilityEsClient({
        client: esClient.asCurrentUser,
        logger,
        plugin: 'inventory',
      });

      const end = moment().valueOf();
      const start = moment(end).subtract(4, 'hours').valueOf();

      const [fieldCaps, { samples, total }] = await Promise.all([
        step('fetching_field_caps', () =>
          getKeywordAndNumericalFields({
            indexPatterns,
            esClient: obsEsClient,
            start,
            end,
          })
        ),
        step('fetching_sample_documents', () =>
          getSampleDocuments({
            esClient: obsEsClient,
            count: 1_000,
            start,
            end,
            indexPatterns,
          })
        ),
      ]);

      const documentAnalysis = mergeSampleDocumentsWithFieldCaps({
        samples,
        total,
        fieldCaps,
      });

      const possibleConstantFields = documentAnalysis.fields.filter(
        (field) => field.cardinality === 1
      );

      const [] = await Promise.all([]);

      return step('extracting_metric_definitions', async (): Promise<MetricDefinition[]> => {
        const truncatedDocumentAnalysis = sortAndTruncateAnalyzedFields(documentAnalysis);

        logger.debug(() => JSON.stringify(truncatedDocumentAnalysis));

        const output = await lastValueFrom(
          inferenceClient
            .output('extract_metric_definitions', {
              connectorId,
              system: `You are a helpful assistant for Elastic Observability. Your
            current task is to extract useful metrics from a dataset. These
            metrics can then be used by the user to visualize metrics.
            
            `,
              input: `

              Extract metric definitions for the following document analysis. Keep
              the following things in mind:

              - This is mostly about timeseries data.
              - This will be used in the UI to populate a list of metrics that
              the user can visualize.
              - The user is mostly interested in monitoring their software
              systems.

              ## Labels

              You can also suggest labels. Labels can be used as grouping keys
              or filters. For labels, you'll usually want keyword fields, but
              it can sometimes also be a numerical field like status code. They
              should have low-ish cardinality, but a field that is a constant
              (ie, a cardinality of 1) or empty is probably not useful.
              
              ## Document analysis

              ${JSON.stringify(truncatedDocumentAnalysis)}
              
              `,
              schema: {
                type: 'object',
                properties: {
                  labels: {
                    type: 'array',
                    items: {
                      type: 'string',
                    },
                    description: 'Fields that could be used as filters or grouping keys',
                  },
                  metrics: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        label: {
                          type: 'string',
                          description: 'A label for the metric',
                        },
                        type: {
                          type: 'string',
                          description: 'The type of metric. The user can change this later',
                          enum: [
                            'count',
                            'count_distinct',
                            'sum',
                            'avg',
                            'weighted_avg',
                            'min',
                            'max',
                            'percentile',
                          ],
                        },
                        field: {
                          type: 'string',
                          description:
                            'The field that should be used, required for every metric type except "count"',
                        },
                        by: {
                          type: 'string',
                          description:
                            'Required for weighted_avg metrics, defines the weighing field',
                        },
                        percentile: {
                          type: 'number',
                          description: 'Required for percentile metrics, an integer from 0-100',
                        },
                        kqlFilter: {
                          type: 'string',
                          description:
                            'A KQL filter to always apply for this metric. Mostly useful for count',
                        },
                        format: {
                          type: 'object',
                          properties: {
                            type: {
                              type: 'string',
                              description: 'How to format the value. Defaults to number',
                              enum: ['number', 'currency', 'duration', 'percentage', 'bytes'],
                            },
                          },
                        },
                      },
                      required: ['label', 'type'],
                    },
                  },
                },
                required: ['metrics', 'labels'],
              } as const,
            })
            .pipe(withoutOutputUpdateEvents())
        );

        const fields = new Set([...fieldCaps.map((cap) => cap.name)]);

        const labels = output.data.output.labels.filter((label) => {
          return fields.has(label);
        });

        return output.data.output.metrics.map((metric): MetricDefinition => {
          return {
            filter: metric.kqlFilter,
            labels,
            metric: metric as Metric,
          };
        });
      });
    }
  );
}
