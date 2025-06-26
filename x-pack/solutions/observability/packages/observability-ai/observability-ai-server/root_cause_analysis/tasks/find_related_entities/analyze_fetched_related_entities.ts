/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceClient } from '@kbn/inference-common';
import { Logger } from '@kbn/logging';
import { getEntityKuery } from '@kbn/observability-utils-common/entities/get_entity_kuery';
import {
  DocumentAnalysis,
  TruncatedDocumentAnalysis,
} from '@kbn/observability-utils-common/llm/log_analysis/document_analysis';
import { sortAndTruncateAnalyzedFields } from '@kbn/observability-utils-common/llm/log_analysis/sort_and_truncate_analyzed_fields';
import { analyzeDocuments } from '@kbn/observability-utils-server/entities/analyze_documents';
import { FieldPatternResultWithChanges } from '@kbn/observability-utils-server/entities/get_log_patterns';
import { TracedElasticsearchClient } from '@kbn/traced-es-client';
import { kqlQuery } from '@kbn/observability-utils-server/es/queries/kql_query';
import { rangeQuery } from '@kbn/observability-utils-server/es/queries/range_query';
import { chunk, isEmpty, isEqual } from 'lodash';
import pLimit from 'p-limit';
import {
  RCA_PROMPT_DEPENDENCIES,
  RCA_PROMPT_ENTITIES,
  RCA_SYSTEM_PROMPT_BASE,
} from '../../prompts';
import { chunkOutputCalls } from '../../util/chunk_output_calls';
import { formatEntity } from '../../util/format_entity';
import { serializeKnowledgeBaseEntries } from '../../util/serialize_knowledge_base_entries';
import { toBlockquote } from '../../util/to_blockquote';
import { ScoredKnowledgeBaseEntry } from '../get_knowledge_base_entries';
import { RelatedEntityKeywordSearch } from './write_keyword_searches_for_related_entities';

export interface RelatedEntityFromSearchResults {
  entity: { [x: string]: string };
  highlight: Record<string, string[]>;
  analysis: TruncatedDocumentAnalysis;
}

function getPromptForFoundEntity({ entity, analysis, highlight }: RelatedEntityFromSearchResults) {
  return `## Entity: ${formatEntity(entity)}

      ${toBlockquote(`### Search highlights for ${formatEntity(entity)}
      ${JSON.stringify(highlight)}`)}
    `;
}

function getInputPromptBase({
  entity,
  analysis,
  ownPatterns,
  patternsFromOtherEntities,
  searches,
  context,
  kbEntries,
}: {
  entity: Record<string, string>;
  analysis: TruncatedDocumentAnalysis;
  ownPatterns: FieldPatternResultWithChanges[];
  patternsFromOtherEntities: FieldPatternResultWithChanges[];
  searches: RelatedEntityKeywordSearch[];
  context: string;
  kbEntries: ScoredKnowledgeBaseEntry[];
}) {
  const otherPatternsPrompt = patternsFromOtherEntities.length
    ? JSON.stringify(
        patternsFromOtherEntities.map((pattern) => ({
          sample: pattern.sample,
          regex: pattern.regex,
        }))
      )
    : 'No relevant log patterns from other entities found';
  const logPatternsPrompt = ownPatterns.length
    ? JSON.stringify(
        ownPatterns.map((pattern) => {
          return { sample: pattern.sample, regex: pattern.regex };
        })
      )
    : 'No log patterns found';
  return `Describe possible relationships to the investigated entity ${formatEntity(entity)}.

  ## Context

  ${toBlockquote(context)}

  ${serializeKnowledgeBaseEntries(kbEntries)}

  ## Data analysis
  ${JSON.stringify(analysis)}

  ## Log patterns for ${formatEntity(entity)}

  ${logPatternsPrompt}

  ## Patterns from other entities

  ${otherPatternsPrompt}

  ## Search keywords

  ${searches
    .map(({ fragments, appearsAs }) => {
      return `## Appears as: ${appearsAs}

        ### Fragments:
        ${fragments.map((fragment) => `- \`${fragment}\``).join('\n')}`;
    })
    .join('\n')}`;
}

function getInputPromptInstructions({ entity }: { entity: Record<string, any> }) {
  return `### Indicator strength

In an Observability system, indicators of relationships between entities like
services, hosts, users, or requests can vary in strength. Some indicators
clearly define relationships, while others only suggest correlations. Here’s a
breakdown of these indicators into strong, average, and weak categories, with an
additional look at how weak indicators can become strong when combined.

Strong indicators provide definitive links between entities. Distributed tracing
IDs (trace, span, and parent) are among the strongest indicators, as they map
the complete request path across services, showing exact service interactions.
Session or user IDs are also strong indicators, capturing a user’s actions
across services or hosts and revealing issues specific to particular users.

Average indicators give helpful context but may require supporting data to
clarify relationships. IP addresses, for instance, are moderately strong for
tracking inter-service calls within controlled environments but are weaker
across public or shared networks where IP reuse is common. URL paths also fall
in this category; they link entities to specific endpoints or service functions
and are moderately strong for tracking interactions between microservices with
known APIs. Port numbers are another average indicator. While they suggest the
service interaction type (HTTP, database), they generally need pairing with IP
addresses or URLs for more accuracy, as port numbers alone are often shared
across different services.

Weak indicators are often too generic to imply a direct relationship but can
suggest possible correlations. Host names, for example, are broad and typically
cover a range of services or applications, especially in large clusters.
Time-based indicators, such as timestamps or TTL values, suggest possible timing
correlations but don’t establish a definitive link on their own. Status codes,
like HTTP 500 errors, indicate issues but don’t specify causality, often
requiring corroboration with stronger indicators like trace or session IDs.

However, weak indicators can become strong when they appear together. For
instance, a combination of IP address, port, and timestamp can strongly suggest
a direct interaction between services, especially when the same combination is
seen repeatedly or in conjunction with related URLs. Similarly, a host name
combined with a unique URL path can strongly suggest that a specific service or
pod is generating particular request patterns, even if each alone is too
general.

## Relevance to the investigation

Given the context of the investigation, some entities might be very relevant
even if there is no strong evidence of them being a direct dependency of
${formatEntity(entity)}. For instance, the related entity might be an
orchestrating entity, or it might be involved in a specific operation related
to the ongoing issue.

## Identifying entity relationships

Your current task is to identify possible entity relationships for the
investigated entity ${formatEntity(entity)}. You will get some context, document
analysis for the investigated entity, and results from keyword searches that were
extracted from the entity. Based on this data, list entities that could possibly
be related to the given entity and/or the initial context. List the highly
relevant entities first.

## Output

For each possible relationship, describe the following things:
- The related entity (as a key-value pair)
- The indicators you have observed as evidence of the relationship. Include the
strength of the indicator, and the exact pieces of data that are related to it
(field names and values, in both the investigated entity, and the possibly
related entity).
- Reason how the related entity is related to both ${formatEntity(entity)} as a
dependency and the context. For instance, describe who is the caller and callee
or whether that is unclear, based on the data, or explain how it might be
related to the context.
- The overall likeliness of it being a relevant entity.`;
}

export async function analyzeFetchedRelatedEntities({
  connectorId,
  inferenceClient,
  esClient,
  start,
  end,
  searches,
  groupingFields,
  index,
  entity,
  ownPatterns,
  analysis,
  patternsFromOtherEntities,
  logger: parentLogger,
  context,
  kbEntries,
}: {
  connectorId: string;
  inferenceClient: InferenceClient;
  esClient: TracedElasticsearchClient;
  start: number;
  end: number;
  searches: RelatedEntityKeywordSearch[];
  groupingFields: string[];
  index: string | string[];
  entity: Record<string, string>;
  analysis: {
    truncated: TruncatedDocumentAnalysis;
    full: DocumentAnalysis;
  };
  ownPatterns: FieldPatternResultWithChanges[];
  patternsFromOtherEntities: FieldPatternResultWithChanges[];
  context: string;
  logger: Logger;
  kbEntries: ScoredKnowledgeBaseEntry[];
}): Promise<{
  summaries: string[];
  foundEntities: RelatedEntityFromSearchResults[];
}> {
  const entityFields = Object.keys(entity);

  const logger = parentLogger.get('findRelatedEntities');

  logger.debug(
    () => `Finding related entities: ${JSON.stringify({ entity, groupingFields, searches })}`
  );

  const allValuesFromEntity = Array.from(
    new Set(analysis.full.fields.flatMap((field) => field.values))
  );

  const foundEntities = (
    await Promise.all(
      groupingFields.map((groupingField) => getResultsForGroupingField(groupingField))
    )
  ).flat();

  logger.debug(() => `Found ${foundEntities.length} entities via keyword searches`);

  const system = `${RCA_SYSTEM_PROMPT_BASE}

  ${RCA_PROMPT_ENTITIES}

  ${RCA_PROMPT_DEPENDENCIES}`;

  const inputPromptBase = getInputPromptBase({
    entity,
    analysis: analysis.truncated,
    ownPatterns,
    patternsFromOtherEntities,
    searches,
    context,
    kbEntries,
  });

  const foundEntityPrompts = foundEntities.map((foundEntity) => {
    return {
      text: getPromptForFoundEntity(foundEntity),
      id: formatEntity(foundEntity.entity),
    };
  });

  const inputPromptInstructions = getInputPromptInstructions({ entity });

  // don't do more than 10 entities in a response, we'll run out of
  // tokens
  const requests = chunk(foundEntityPrompts, 10).flatMap((texts) =>
    chunkOutputCalls({
      system,
      input: `${inputPromptBase} ${inputPromptInstructions}`,
      texts,
      tokenLimit: 32_000 - 6_000,
    })
  );

  const allRelevantEntityDescriptions = await Promise.all(
    requests.map(async (request) => {
      const outputCompleteEvent = await inferenceClient.output({
        id: 'describe_relevant_entities',
        connectorId,
        system: request.system,
        input: `${inputPromptBase}

          # Found entities

          ${request.texts.map((text) => text.text).join('\n\n')}

          ${inputPromptInstructions}`,
      });

      return outputCompleteEvent.content;
    })
  );

  return {
    summaries: allRelevantEntityDescriptions,
    foundEntities,
  };

  async function getResultsForGroupingField(
    groupingField: string
  ): Promise<RelatedEntityFromSearchResults[]> {
    const excludeQuery = isEqual([groupingField], entityFields)
      ? `NOT (${groupingField}:"${entity[groupingField]}")`
      : ``;

    const fieldCaps = await esClient.fieldCaps('check_if_grouping_field_exists', {
      fields: [groupingField],
      index,
      index_filter: {
        bool: {
          filter: [...rangeQuery(start, end)],
        },
      },
    });

    if (isEmpty(fieldCaps.fields[groupingField])) {
      return [];
    }

    const keywordSearchResults = await esClient.search(
      'find_related_entities_via_keyword_searches',
      {
        track_total_hits: false,
        index,
        query: {
          bool: {
            must: [...rangeQuery(start, end), ...kqlQuery(excludeQuery)],
            should: [
              {
                multi_match: {
                  query: searches.flatMap((search) => search.fragments).join(' '),
                  fields: '*',
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
        fields: [groupingField],
        collapse: {
          field: groupingField,
        },
        highlight: {
          fields: {
            '*': {},
          },
        },
        _source: false,
        size: 1_000,
      }
    );

    if (!keywordSearchResults.hits.hits.length) {
      logger.debug(() => `No hits: ${JSON.stringify({ entity, groupingField, searches })}`);
      return [];
    }

    logger.trace(
      () =>
        `Hits: ${JSON.stringify({
          entity,
          groupingField,
          searches,
          count: keywordSearchResults.hits.hits.length,
          hits: keywordSearchResults.hits.hits,
        })}`
    );

    const limiter = pLimit(20);

    const groupingFieldAnalysis = await Promise.all(
      keywordSearchResults.hits.hits.map(async (hit) => {
        return limiter(async () => {
          const groupValue = hit.fields![groupingField]?.[0] as string;

          const analysisForGroupingField = await analyzeDocuments({
            esClient,
            start,
            end,
            index,
            kuery: getEntityKuery({
              [groupingField]: groupValue,
            }),
          });

          const analysisWithRelevantValues = {
            ...analysisForGroupingField,
            fields: analysisForGroupingField.fields
              .filter((field) => {
                return !field.empty;
              })
              .map((field) => {
                const valuesFoundInEntity = field.values.filter((value) => {
                  return (
                    allValuesFromEntity.includes(value) ||
                    allValuesFromEntity.some((valueFromEntity) => {
                      return (
                        typeof valueFromEntity === 'string' &&
                        typeof value === 'string' &&
                        (value.includes(valueFromEntity) || valueFromEntity.includes(value))
                      );
                    })
                  );
                });
                return {
                  ...field,
                  values: valuesFoundInEntity,
                };
              }),
          };

          return {
            groupingField,
            key: groupValue,
            highlight: hit.highlight!,
            analysis: sortAndTruncateAnalyzedFields(analysisWithRelevantValues),
          };
        });
      })
    );

    return groupingFieldAnalysis.map(({ key, highlight, analysis: analysisForGroupingField }) => {
      return {
        entity: {
          [groupingField]: key,
        },
        highlight,
        analysis: analysisForGroupingField,
      };
    });
  }
}
