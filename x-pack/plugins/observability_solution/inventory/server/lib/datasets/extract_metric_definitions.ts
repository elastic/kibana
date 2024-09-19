/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient, Logger } from '@kbn/core/server';
import { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import { i18n } from '@kbn/i18n';
import { correctCommonEsqlMistakes } from '@kbn/inference-plugin/common';
import {
  ChatCompletionEventType,
  ChatCompletionMessageEvent,
} from '@kbn/inference-plugin/common/chat_complete';
import {
  naturalLanguageToEsql,
  withoutOutputUpdateEvents,
  type InferenceClient,
} from '@kbn/inference-plugin/server';
import { excludeFrozenQuery } from '@kbn/observability-utils-common/es/queries/exclude_frozen_query';
import { rangeQuery } from '@kbn/observability-utils-common/es/queries/range_query';
import {
  ObservabilityElasticsearchClient,
  createObservabilityEsClient,
} from '@kbn/observability-utils-server/es/client/create_observability_es_client';
import moment from 'moment';
import { Observable, filter, lastValueFrom } from 'rxjs';
import { Entity } from '../../../common/entities';
import { MetricDefinition } from '../../../common/metrics';
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
  constants: Array<{ field: string; value: unknown }>;
  metrics: Array<Pick<MetricDefinition, 'displayName' | 'filter' | 'expression'>>;
}

export type ExtractMetricDefinitionProcess = StepProcess<
  {
    fetching_field_caps: { label: string };
    fetching_sample_documents: { label: string };
    extracting_constant_keywords: { label: string };
    describe_dataset: { label: string };
    generating_esql_queries: { label: string };
    generating_metric_suggestions: { label: string };
  },
  ExtractMetricDefinitionResult
>;

export function extractMetricDefinitions({
  indexPatterns,
  inferenceClient,
  esClient,
  logger,
  connectorId,
  entity,
  dslFilter,
}: {
  indexPatterns: string[];
  inferenceClient: InferenceClient;
  esClient: IScopedClusterClient;
  logger: Logger;
  connectorId: string;
  entity: Pick<Entity, 'type' | 'displayName'>;
  dslFilter: QueryDslQueryContainer[];
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
      generating_esql_queries: {
        label: i18n.translate(
          'xpack.inventory.datasets.extractMetricDefinitionStep.generatingEsqlQueries',
          {
            defaultMessage: 'Generating ES|QL queries',
          }
        ),
      },
      generating_metric_suggestions: {
        label: i18n.translate(
          'xpack.inventory.datasets.extractMetricDefinitionStep.generatingMetricSuggestions',
          {
            defaultMessage: 'Generating metric suggestions',
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
            dslFilter,
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

      const truncatedDocumentAnalysisWithoutEmptyFields = sortAndTruncateAnalyzedFields({
        ...documentAnalysis,
        fields: documentAnalysis.fields.filter((field) => !field.empty),
      });

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
            
            ${JSON.stringify(truncatedDocumentAnalysisWithoutEmptyFields)}
            `,
            })
            .pipe(withoutOutputUpdateEvents())
        );

        logger.debug(() => JSON.stringify(outputCompleteEvent));

        return outputCompleteEvent.content;
      });

      const esqlQueries = await step('generating_esql_queries', async () => {
        const esqlOutput = await lastValueFrom(
          naturalLanguageToEsql({
            client: inferenceClient,
            connectorId,
            system: `Your current task is to generate ES|QL queries
              that can be used by the user to monitor this ${entity.type}.
              These metric definitions can then be used by the user in
              Kibana to visualize and analyze their data. Keep the 
              things in mind:

              - This is mostly about timeseries data.
              - This will be used in the UI to populate a list of metrics that
              the user can visualize.
              - The user is mostly interested in monitoring their software
              systems.

              First, decide what metrics are useful. For example, you might
              want to generate cpu/memory metrics for an infrastructure
              entity, or RED (rate, error, duration) metrics, or service-
              specific metrics like queue length or ingest delay. Another
              type of metric that is useful is one that filters on specific
              messages. For example,  \`WHERE message LIKE "?HTTP probe
              failed?"\`).

              # Critical instructions:
              - ONLY generate useful metrics. Make sure that any metric that
              you generate A) works, and B) has value to the user. If you're
              using some of the examples above, consider whether this really
              makes sense for the monitored entity.
              - ONLY use fields that are mentioned in this prompt. Any other
              fields are NOT available and will result in an error.
              - DO NOT attempt to parse a log message using things like 
              GROK, DISSECT, RLIKE etc.
              - DO NOT specify grouping fields. These will be added on the
              fly. DO NOT USE \`STATS ... BY\`, only use \`STATS\`.
              - Try to create a _single_ column in STATS ... BY.
              - DO NOT filter on the current ${entity.type}. That will happen
              automatically.

              EXTREMELY IMPORTANT: After each query, you MUST reflect on
              whether the query makes sense and verify that the fields that
              are used are available in the dataset. ONLY fields mentioned
              in this prompt are available.

              Format it as follows:

              ## <Metric display name>

              \`\`\`esql
              ...<esql query>
              \`\`\`

              Description: <description>
              Usefulness: <usefulness>
              Validity: <validity>`,
            input: `Generate metric descriptions based on the following
              information:
              # Entity

              The monitored entity is ${entity.displayName} which is 
              a ${entity.type}.

              ## Dataset name

              The dataset's name is ${indexPatterns.join(', ')}

              ### Dataset description
              
              ${description ?? 'N/A'}
                  
              ## Available fields
              
              ${documentAnalysis.fields
                .filter(
                  (field) => !field.empty && (field.cardinality ?? Number.POSITIVE_INFINITY) > 1
                )
                .map((field) => `- ${field.name} (${field.types.join(', ')})`)
                .join('\n')}

              `,
            logger,
          }).pipe(
            filter((event): event is ChatCompletionMessageEvent => {
              return event.type === ChatCompletionEventType.ChatCompletionMessage;
            })
          )
        );

        return esqlOutput.content.replaceAll(/INLINE_ESQL_QUERY_REGEX/g, (match, query) => {
          const correctionResult = correctCommonEsqlMistakes(query);
          return '```esql\n' + correctionResult.output + '\n```';
        });
      });

      return step(
        'generating_metric_suggestions',
        async (): Promise<ExtractMetricDefinitionResult> => {
          const output = await lastValueFrom(
            inferenceClient
              .output('generate_metric_suggestions', {
                connectorId,
                system: `Your current task is to generate metric definitions.
            These metric definitions have a display name which will be
            used in the UI to display the metric definition as a
            suggestion to the user. It can then be used to visualize or
            filter data. You have previously generated ES|QL queries.
            Your job is to extract a structural definition from these
            example queries. Remove any grouping fields in STATS .. BY
            commands, they will not be used. If the metric depends on
            the grouping, figure out if you can convert it to a filter
            or do not use it at all.

            Here are some examples:

            \`\`\`esql
            FROM ${indexPatterns.join(',')} 
            | WHERE log.level == "error"
            \`\`\`
            
            becomes:
            {
              "displayName": "Errors",
              "filter": "log.level:\"error\""
            }

            \`\`\`esql
            FROM ${indexPatterns.join(',')} 
            | STATS transaction_duration = AVG(transaction.duration.us), failure_rate = AVG(event.outcome == "success", 1, 0)
            \`\`\`

            becomes:
            [
              {
                "displayName": "Transaction duration",
                "expression": "AVG(transaction.duration.us)"
              },
              {
                "displayName": "Failure rate",
                "expression": "AVG(CASE(event.outcome == \"success\", 1, 0))"
              }
            ]

            \`\`\`esql
            FROM ${indexPatterns.join(',')}
            | WHERE service.name == "konnectivity-agent"
            | EVAL is_failure = CASE(status_code >= 500, 1, 0)
            | STATS total_requests = COUNT(*), total_failures = SUM(is_failure) BY bucket = BUCKET(@timestamp, 1 hour)
            | EVAL failure_rate = total_failures / total_requests
            | SORT bucket
            \`\`\`

            becomes:
            [
              {
                "displayName": "Failure rate",
                "expression": "AVG(CASE(status_code >= 500, 1, NULL))"
              }
            ]

            \`\`\`esql
            FROM ${indexPatterns.join(',')}
              | COUNT(CASE(event.outcome == "success", 1, NULL))
            \`\`\`

            becomes:
            [
              {
                "displayName": "Failed events",
                "filter": "event.outcome:\"success\""
              }
            ]

            IT IS ABSOLUTELY CRITICAL that for the \`filter\` property,
            you convert an ES|QL \`WHERE\` command to KQL, the Kibana
            Query Language. Conversion examples:

            - \`| WHERE service.name == "opbeans-java"\` becomes
              \`service.name:"opbeans-java"\`
            - \`| WHERE service.environment IN ("production", "dev")\`
              becomes \`service.environment:("production" OR "dev")
            - \`| WHERE cloud.region != "us-west-1a"\` becomes
              \`NOT (cloud.region:"us-west-1a)\`
            - \`| WHERE cloud.region IS NULL\` becomes
              \`NOT (cloud.region:*)\`
            _ \`| WHERE agent.name == "java" OR agent.name == "go"\`
              becomes \`(agent.name:"java" OR agent.name:"go")\`
            - \`| WHERE first_name LIKE "b?joe"\` becomes \`first_name:b*joe\`

            NOTE: KQL does not support regex (RLIKE). Try to convert
            these to wildcard patterns.

            The following characters must be escaped: \():<>"*`,
                input: `Convert these ES|QL queries into metric
            definitions, based on the following information:
            
            # Entity

            The monitored entity is ${entity.displayName} which is 
            a ${entity.type}.

             ## Dataset name

            The dataset's name is ${indexPatterns.join(', ')}

            ### Dataset description
            
            ${description ?? 'N/A'}

            ${constantKeywordsInstruction}
                
            ## Document analysis
            
            ${JSON.stringify(truncatedDocumentAnalysisWithoutEmptyFields)}

            # ES|QL output

            This output was previously generated. Convert these examples
            into metric definitions.

            ${esqlQueries}
          
          `,
                schema: {
                  type: 'object',
                  properties: {
                    definitions: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          displayName: {
                            type: 'string',
                          },
                          kqlFilter: {
                            type: 'string',
                          },
                          expression: {
                            type: 'string',
                          },
                        },
                        required: ['displayName'],
                      },
                    },
                  },
                  required: ['definitions'],
                } as const,
              })
              .pipe(withoutOutputUpdateEvents())
          );

          return {
            constants: actualConstantFields,
            description,
            metrics: output.output.definitions.map((definition) => ({
              displayName: definition.displayName,
              expression: definition.expression,
              filter: definition.kqlFilter,
            })),
          };
        }
      );
    }
  );
}
