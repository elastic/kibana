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
} from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import moment from 'moment';
import { Observable, lastValueFrom } from 'rxjs';
import { excludeFrozenQuery } from '@kbn/observability-utils-common/es/queries/exclude_frozen_query';
import { rangeQuery } from '@kbn/observability-utils-common/es/queries/range_query';
import { Metric, MetricDefinition } from '../../../common/metrics';
import { sortAndTruncateAnalyzedFields } from '../../../common/utils/sort_and_truncate_analyzed_fields';
import { mergeSampleDocumentsWithFieldCaps } from '../../util/merge_sample_documents_with_field_caps';
import { getSampleDocuments } from '../get_sample_documents';
import { StepProcess, runSteps } from '../run_steps';
import { confirmConstantsInDataset } from './confirm_constants_in_dataset';

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
    index_filter: {
      bool: {
        filter: [...excludeFrozenQuery(), ...rangeQuery(start, end)],
      },
    },
  });

  return Object.entries(fieldCaps.fields).map(([fieldName, fieldSpec]) => {
    return {
      name: fieldName,
      esTypes: Object.keys(fieldSpec),
    };
  });
}

interface ExtractMetricDefinitionResult {
  description?: string;
  labels: string[];
  constants: Array<{ field: string; value: unknown }>;
  metrics: MetricDefinition[];
}

export type ExtractMetricDefinitionProcess = StepProcess<
  {
    fetching_field_caps: { label: string };
    fetching_sample_documents: { label: string };
    extracting_constant_keywords: { label: string };
    describe_dataset: { label: string };
    extracting_labels: { label: string };
    extracting_metric_definitions: { label: string };
  },
  ExtractMetricDefinitionResult
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
      extracting_labels: {
        label: i18n.translate(
          'xpack.inventory.datasets.extractMetricDefinitionStep.extractingLabels',
          {
            defaultMessage: 'Extracting labels',
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
        (field) => field.cardinality === 1 || field.cardinality === null
      );

      const constants = await step('extracting_constant_keywords', () =>
        confirmConstantsInDataset({
          indexPatterns,
          constants: possibleConstantFields.map((field) => ({ field: field.name })),
          esClient: obsEsClient,
        })
      );

      const truncatedDocumentAnalysis = sortAndTruncateAnalyzedFields(documentAnalysis);

      const system = `You are a helpful assistant for Elastic Observability.
              Your goal is to help users understand their data. You are a
              Distinguished SRE, who is comfortable explaining Observability
              concepts to more novice SREs. You excel at understanding
              Observability signals, extracting metrics, labels and filters
              from logs data, and building dashboards on top of log data
              using the Elastic platform.`;
      const actualConstantFields = constants.filter(
        (
          constant
        ): constant is (typeof constants)[number] & { value: string | number | boolean | null } =>
          constant.constant
      );

      const constantKeywordsInstruction = actualConstantFields.length
        ? `## Constant keywords

  The following constant values are found in the dataset. They
  are the same on every document:

  ${actualConstantFields.map((field) => `- ${field.field}: ${field.value}`).join('\n')}`
        : ``;

      const description = await step('describe_dataset', async () => {
        const outputCompleteEvent = await lastValueFrom(
          inferenceClient
            .output('describe_dataset', {
              connectorId,
              system,
              input: `Your current task is to describe a dataset using sample
            documents and constant keywords found in the dataset. The
            description you generate should help users understand the data
            in this dataset: what it means, and what value can be extracted
            from it that is helpful in observing the user's systems.

            There is no need to list all the labels or constant keywords as
            they will be displayed to the user separately. Instead, use
            the labels and constant keywords to inform your description.

            ## Dataset name

            The dataset's name is ${indexPatterns.join(', ')}

            ${constantKeywordsInstruction}
                
            ## Document analysis
            
            ${JSON.stringify(truncatedDocumentAnalysis)}
            `,
            })
            .pipe(withoutOutputUpdateEvents())
        );

        logger.debug(() => JSON.stringify(outputCompleteEvent));

        return outputCompleteEvent.data.content;
      });

      const labels = await step('extracting_labels', async () => {
        const completeEvent = await lastValueFrom(
          inferenceClient
            .output('extracting_labels', {
              connectorId,
              system,
              input: `Your current task is to extract labels for this dataset.
          These labels can then be used for grouping or filtering. For
          instance, "service.environment" might be a good label (for filtering),
          and "host.name" might be a good label (for filtering and grouping).

          DO NOT include constant keywords as labels, they're already presented
          to the user.
          
          ## Dataset name

          The dataset's name is ${indexPatterns.join(', ')}

          ### Dataset description
          
          ${description ?? 'N/A'}

          ${constantKeywordsInstruction}
              
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
                  },
                },
                required: ['labels'],
              } as const,
            })
            .pipe(withoutOutputUpdateEvents())
        );

        return completeEvent.data.output.labels;
      });

      return step(
        'extracting_metric_definitions',
        async (): Promise<ExtractMetricDefinitionResult> => {
          const output = await lastValueFrom(
            inferenceClient
              .output('extract_metric_definitions', {
                connectorId,
                system,
                input: `Your current task is to extract metric
              definitions for this dataset. These metric definitions
              can then be used by the user in Kibana to visualize and
              analyze their data. Keep the following things in mind:

              - This is mostly about timeseries data.
              - Constant keywords are not useful as grouping fields or
              a filter, because it will not change the displayed data.
              - This will be used in the UI to populate a list of metrics that
              the user can visualize.
              - The user is mostly interested in monitoring their software
              systems.
              - List between 5 and 20 metric definitions.

              Some example metrics:

              - Health metrics
              - Throughput, latency, failure rate (RED)
              - Queue metrics
              - CPU/memory metrics

              ## Dataset name

              The dataset's name is ${indexPatterns.join(', ')}

              ### Dataset description
              
              ${description ?? 'N/A'}

              ${constantKeywordsInstruction}

              ## Labels

              ${labels.map((label) => `- ${label}`).join('\n')}
                  
              ## Document analysis
              
              ${JSON.stringify(truncatedDocumentAnalysis)}
              
              `,
                schema: {
                  type: 'object',
                  properties: {
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
                          grouping: {
                            type: 'string',
                            description: 'Group data by a specific field',
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
                  required: ['metrics'],
                } as const,
              })
              .pipe(withoutOutputUpdateEvents())
          );

          return {
            description,
            labels,
            constants: actualConstantFields,
            metrics: output.data.output.metrics.map((metric): MetricDefinition => {
              return {
                filter: metric.kqlFilter,
                metric: metric as Metric,
              };
            }),
          };
        }
      );
    }
  );
}
