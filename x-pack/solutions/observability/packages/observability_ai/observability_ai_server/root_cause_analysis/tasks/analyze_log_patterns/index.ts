/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getEntityKuery } from '@kbn/observability-utils-common/entities/get_entity_kuery';
import { formatValueForKql } from '@kbn/observability-utils-common/es/format_value_for_kql';
import type { TruncatedDocumentAnalysis } from '@kbn/observability-utils-common/llm/log_analysis/document_analysis';
import { ShortIdTable } from '@kbn/observability-utils-common/llm/short_id_table';
import {
  P_VALUE_SIGNIFICANCE_HIGH,
  P_VALUE_SIGNIFICANCE_MEDIUM,
} from '@kbn/observability-utils-common/ml/p_value_to_label';
import {
  FieldPatternResultWithChanges,
  getLogPatterns,
} from '@kbn/observability-utils-server/entities/get_log_patterns';
import { castArray, compact, groupBy, orderBy } from 'lodash';
import { RCA_PROMPT_CHANGES, RCA_PROMPT_ENTITIES } from '../../prompts';
import { RootCauseAnalysisContext } from '../../types';
import { formatEntity } from '../../util/format_entity';
import { serializeKnowledgeBaseEntries } from '../../util/serialize_knowledge_base_entries';
import { ScoredKnowledgeBaseEntry } from '../get_knowledge_base_entries';

type LogPatternRelevance = 'normal' | 'unusual' | 'warning' | 'critical';

export type AnalyzedLogPattern = FieldPatternResultWithChanges & {
  relevance: LogPatternRelevance;
  interesting: boolean;
};

export interface AnalyzeLogPatternOutput {
  ownPatterns: AnalyzedLogPattern[];
  patternsFromOtherEntities: AnalyzedLogPattern[];
}

const normalDescription = `normal operations, such as such access logs`;
const unusualDescription = `something unusual and/or
appear rarely, such as startup or shutdown messages or
other rare vents`;
const warningDescription = `something being in an unexpected state,
such as error messages, rate limiting or disk usage warnings`;
const criticalDescription = `something being in a critical state,
such as startup failure messages, out-of-memory errors or crashloopbackoff
events`;

interface LogPatternCutOff {
  significance?: 'high' | 'medium' | 'low';
  pValue?: number;
}

export async function analyzeLogPatterns({
  entity,
  allAnalysis,
  system,
  rcaContext: { logger: parentLogger, inferenceClient, connectorId, esClient, start, end, indices },
  cutoff,
  kbEntries,
}: {
  entity: Record<string, string>;
  allAnalysis: Array<{ index: string | string[]; analysis: TruncatedDocumentAnalysis }>;
  system: string;
  cutoff?: LogPatternCutOff;
  kbEntries: ScoredKnowledgeBaseEntry[];
  rcaContext: Pick<
    RootCauseAnalysisContext,
    'indices' | 'logger' | 'inferenceClient' | 'connectorId' | 'esClient' | 'start' | 'end'
  >;
}): Promise<AnalyzeLogPatternOutput> {
  const kuery = getEntityKuery(entity);

  const logger = parentLogger.get('analyzeLogPatterns');

  const fields = ['message', 'error.exception.message'];

  logger.debug(() => `Analyzing log patterns for ${JSON.stringify(entity)}`);

  const systemPrompt = `You are a helpful assistant for Elastic Observability.
    You are an expert in analyzing log messages for software
    systems, and you use your extensive experience as an SRE
    to thoroughly analyze log patterns for things that require
    attention from the user.

    ${RCA_PROMPT_CHANGES}

    ${RCA_PROMPT_ENTITIES}

    ## Entity

    The following entity is being analyzed:

    ${formatEntity(entity)}

    ${serializeKnowledgeBaseEntries(kbEntries)}

    ### Entity analysis

    ${allAnalysis.map(({ index: analyzedIndex, analysis }) => {
      return `#### Indices: ${castArray(analyzedIndex).join(',')}

  ${JSON.stringify(analysis)}`;
    })}

    ${system}`;

  const kueryForOtherEntities = `NOT (${kuery}) AND ${Object.values(entity)
    .map(
      (val) =>
        `(${fields.map((field) => `(${[field, formatValueForKql(val)].join(':')})`).join(' OR ')})`
    )
    .join(' AND ')}`;

  const [logPatternsFromEntity, logPatternsFromElsewhere] = await Promise.all([
    getLogPatterns({
      esClient,
      index: [...indices.logs, ...indices.traces],
      start,
      end,
      kuery,
      includeChanges: true,
      fields,
      metadata: [],
    }),
    getLogPatterns({
      esClient,
      index: [...indices.logs],
      start,
      end,
      kuery: kueryForOtherEntities,
      metadata: Object.keys(entity),
      includeChanges: true,
      fields,
    }),
  ]);
  const patternIdLookupTable = new ShortIdTable();

  logger.debug(
    () =>
      `Found ${logPatternsFromEntity.length} own log patterns and ${logPatternsFromElsewhere.length} from others`
  );

  logger.trace(
    () =>
      `Found log patterns${JSON.stringify({
        entity,
        logPatternsFromEntity,
        logPatternsFromElsewhere,
      })}`
  );

  const patternsWithIds = [...logPatternsFromEntity, ...logPatternsFromElsewhere].map((pattern) => {
    return {
      ...pattern,
      shortId: patternIdLookupTable.take(pattern.regex),
    };
  });

  const patternsByRegex = new Map(patternsWithIds.map((pattern) => [pattern.regex, pattern]));

  const serializedOwnEntity = formatEntity(entity);

  const [ownPatterns, patternsFromOtherEntities] = await Promise.all([
    logPatternsFromEntity.length ? categorizeOwnPatterns() : [],
    logPatternsFromElsewhere.length ? selectRelevantPatternsFromOtherEntities() : [],
  ]);

  logger.trace(
    () =>
      `Classified log patterns ${JSON.stringify([entity, ownPatterns, patternsFromOtherEntities])}`
  );

  const allPatterns = [...ownPatterns, ...patternsFromOtherEntities];

  const sortedByPValueAsc = orderBy(
    allPatterns.filter((pattern) => pattern.change && pattern.change.p_value),
    (pattern) => {
      return pattern.change.p_value;
    },
    'asc'
  );

  const pValueCutOff = getPValueCutoff({ cutoff, max: sortedByPValueAsc[0]?.change.p_value });

  return {
    ownPatterns: ownPatterns.map((pattern) => ({
      ...pattern,
      interesting: isInterestingPattern(pattern, pValueCutOff),
    })),
    patternsFromOtherEntities: patternsFromOtherEntities.map((pattern) => ({
      ...pattern,
      interesting: isInterestingPattern(pattern, pValueCutOff),
    })),
  };

  function categorizeOwnPatterns() {
    return inferenceClient
      .output({
        id: 'analyze_log_patterns',
        connectorId,
        system: systemPrompt,
        input: `Based on the following log patterns from
            ${formatEntity(entity)}, group these patterns into
            the following categories:

            - normal (patterns that are indicative of ${normalDescription})
            - unusual (patterns that are indicative of ${unusualDescription})
            - warning (patterns that are indicative of ${warningDescription})
            - critical (patterns that are indicative of ${criticalDescription})

            ## Log patterns:

            ${preparePatternsForLlm(logPatternsFromEntity)}
          `,
        schema: {
          type: 'object',
          properties: {
            categories: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  relevance: {
                    type: 'string',
                    enum: ['normal', 'unusual', 'warning', 'critical'],
                  },
                  shortIds: {
                    type: 'array',
                    description:
                      'The pattern IDs you want to group here. Use the pattern short ID.',
                    items: {
                      type: 'string',
                    },
                  },
                },
                required: ['relevance', 'shortIds'],
              },
            },
          },
          required: ['categories'],
        } as const,
      })
      .then((outputEvent) => {
        return outputEvent.output.categories.flatMap((category) => {
          return mapIdsBackToPatterns(category.shortIds).map((pattern) => {
            return {
              ...pattern,
              relevance: category.relevance,
            };
          });
        });
      });
  }

  function selectRelevantPatternsFromOtherEntities() {
    return inferenceClient
      .output({
        id: 'select_relevant_patterns_from_other_entities',
        connectorId,
        system: systemPrompt,
        input: `Based on the following log patterns that
            are NOT from ${serializedOwnEntity}, group these
            patterns into the following categories:

            - irrelevant (patterns that are not relevant for
            ${serializedOwnEntity})
            - normal (patterns that relevant for
            ${serializedOwnEntity} and are indicative of ${normalDescription})
            - unusual (patterns that are relevant for
            ${serializedOwnEntity} and are indicative of ${unusualDescription})
            - warning (patterns that are relevant for
            ${serializedOwnEntity} and are indicative of ${warningDescription})
            - critical (patterns that are relevant for
            ${serializedOwnEntity} and are indicative of ${criticalDescription})

            Relevant patterns are messages that mention the
            investigated entity, or things that are indicative
            of critical failures or changes in the entity
            that owns the log pattern.

            ## Log patterns:

            ${preparePatternsForLlm(logPatternsFromElsewhere)}
          `,
        schema: {
          type: 'object',
          properties: {
            categories: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  relevance: {
                    type: 'string',
                    enum: ['irrelevant', 'normal', 'unusual', 'warning', 'critical'],
                  },
                  shortIds: {
                    type: 'array',
                    description:
                      'The pattern IDs you want to group here. Use the pattern short ID.',
                    items: {
                      type: 'string',
                    },
                  },
                },
                required: ['relevance', 'shortIds'],
              },
            },
          },
          required: ['categories'],
        } as const,
      })
      .then((outputEvent) => {
        return outputEvent.output.categories.flatMap((category) => {
          return mapIdsBackToPatterns(category.shortIds).flatMap((pattern) => {
            if (category.relevance === 'irrelevant') {
              return [];
            }
            return [
              {
                ...pattern,
                relevance: category.relevance,
              },
            ];
          });
        });
      });
  }

  function preparePatternsForLlm(patterns: FieldPatternResultWithChanges[]): string {
    const groupedByField = groupBy(patterns, (pattern) => pattern.field);

    return Object.entries(groupedByField)
      .map(([field, patternsForField]) => {
        return `### \`${field}\`
        
        #### Patterns
        
        ${JSON.stringify(
          patternsForField.map((pattern) => {
            return {
              shortId: patternIdLookupTable.take(pattern.regex),
              regex: pattern.regex,
              sample: pattern.sample,
              highlight: pattern.highlight,
              change: pattern.change,
            };
          })
        )}
        `;
      })
      .join('\n\n');
  }

  function mapIdsBackToPatterns(ids?: string[]) {
    return compact(
      ids?.map((shortId) => {
        const lookupId = patternIdLookupTable.lookup(shortId);
        if (!lookupId) {
          return undefined;
        }
        const pattern = patternsByRegex.get(lookupId);
        return pattern;
      })
    );
  }
}

function isInterestingPattern(
  pattern: Omit<AnalyzedLogPattern, 'interesting'>,
  pValueCutOff: number
) {
  return (pattern.change.p_value ?? 1) <= pValueCutOff || pattern.relevance !== 'normal';
}

function getPValueCutoff({ max, cutoff }: { max?: number; cutoff?: LogPatternCutOff }) {
  if (cutoff?.pValue) {
    return cutoff?.pValue;
  }

  if (cutoff?.significance === 'high') {
    return P_VALUE_SIGNIFICANCE_HIGH;
  }

  if (cutoff?.significance === 'medium') {
    return P_VALUE_SIGNIFICANCE_MEDIUM;
  }

  if (max === undefined) {
    return Number.MAX_VALUE;
  }

  if (max <= P_VALUE_SIGNIFICANCE_HIGH) {
    return P_VALUE_SIGNIFICANCE_HIGH;
  }

  if (max <= P_VALUE_SIGNIFICANCE_MEDIUM) {
    return P_VALUE_SIGNIFICANCE_MEDIUM;
  }

  return Number.MAX_VALUE;
}
