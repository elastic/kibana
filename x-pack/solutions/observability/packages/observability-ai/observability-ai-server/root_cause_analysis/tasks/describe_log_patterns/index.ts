/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceClient } from '@kbn/inference-common';
import { TruncatedDocumentAnalysis } from '@kbn/observability-utils-common/llm/log_analysis/document_analysis';
import { omit, partition, sumBy } from 'lodash';
import { RCA_SYSTEM_PROMPT_BASE } from '../../prompts';
import { formatEntity } from '../../util/format_entity';
import { serializeKnowledgeBaseEntries } from '../../util/serialize_knowledge_base_entries';
import { AnalyzedLogPattern } from '../analyze_log_patterns';
import { ScoredKnowledgeBaseEntry } from '../get_knowledge_base_entries';
import { getInvestigateEntityTaskPrompt } from '../investigate_entity/prompts';

export interface LogPatternDescription {
  content: string;
  docCount: number;
  interestingPatternCount: number;
  ignoredPatternCount: number;
  ignoredDocCount: number;
}

export async function describeLogPatterns({
  inferenceClient,
  connectorId,
  entity,
  contextForEntityInvestigation,
  analysis,
  ownPatterns: allOwnPatterns,
  patternsFromOtherEntities,
  kbEntries,
}: {
  inferenceClient: InferenceClient;
  connectorId: string;
  entity: Record<string, string>;
  analysis: TruncatedDocumentAnalysis;
  contextForEntityInvestigation: string;
  ownPatterns: AnalyzedLogPattern[];
  patternsFromOtherEntities: AnalyzedLogPattern[];
  kbEntries: ScoredKnowledgeBaseEntry[];
}): Promise<LogPatternDescription> {
  const system = RCA_SYSTEM_PROMPT_BASE;

  const [ownInterestingPatterns, ignoredOwnPatterns] = partition(
    allOwnPatterns,
    (pattern) => pattern.interesting
  );

  const stats = {
    docCount: sumBy(allOwnPatterns, (pattern) => pattern.count),
    interestingPatternCount: ownInterestingPatterns.length,
    otherInterestingPatternCount: patternsFromOtherEntities.length,
    ignoredPatternCount: ignoredOwnPatterns.length,
    ignoredDocCount: sumBy(ignoredOwnPatterns, (pattern) => pattern.count),
  };

  const header = `## Log analysis
  
  ### Stats for own log patterns:  
  - ${stats.docCount} documents analyzed
  - ${stats.interestingPatternCount} interesting patterns
  - ${stats.ignoredPatternCount} ignored patterns, accounting for
  ${stats.ignoredDocCount} out of ${stats.docCount} documents
  - ${stats.otherInterestingPatternCount} relevant patterns from
  other entities`;

  if (!stats.interestingPatternCount && !stats.otherInterestingPatternCount) {
    return {
      ...stats,
      content: `${header}\n\nNo interesting log patterns`,
    };
  }

  const ownLogPatternsPrompt = ownInterestingPatterns.length
    ? JSON.stringify(
        ownInterestingPatterns.map(({ regex, sample, change, count, timeseries }) => ({
          regex,
          sample,
          change,
          count,
          timeseries: timeseries.map(({ x, y }, index) => {
            if (index === change.change_point) {
              return `${change.type} at ${new Date(x).toISOString()}: ${y}`;
            }
            return `${new Date(x).toISOString()}: ${y}`;
          }),
        }))
      )
    : 'No own log patterns found';

  const otherLogPatternsPrompt = patternsFromOtherEntities.length
    ? JSON.stringify(
        patternsFromOtherEntities.map(
          ({ regex, sample, change, count, timeseries, metadata, field, highlight }) => ({
            regex,
            sample,
            change,
            count,
            timeseries: timeseries.map(({ x, y }, index) => {
              if (index === change.change_point) {
                return `${change.type} at ${new Date(x).toISOString()}: ${y}`;
              }
              return `${new Date(x).toISOString()}: ${y}`;
            }),
            entity: omit(metadata, field),
            highlight,
          })
        )
      )
    : 'No relevant log patterns found from other entities';

  const input = `${getInvestigateEntityTaskPrompt({ entity, contextForEntityInvestigation })}

    ## Context for investigating ${formatEntity(entity)}

    ${contextForEntityInvestigation}

    ${serializeKnowledgeBaseEntries(kbEntries)}

    ## Data samples

    ${JSON.stringify(analysis)}

    ## Log patterns from ${formatEntity(entity)}

    ${ownLogPatternsPrompt}

    ## Possibly relevant log patterns from other entities

    ${otherLogPatternsPrompt}

    ### Interpreting log patterns and samples

    The pattern itself is what is consistent across all messages. The values from these parts
    are separately given in "constants". There's also a single (random) _sample_ included, with
    the variable part being given as well. E.g., if the failure in the sample is not part of the pattern
    itself, you should mention that in your analysis.

    ## Task

    Using only the log patterns, describe your observations about the entity.

    Group these pattterns together based on topic. Some examples of these topics:

    - normal operations such as request logs
    - connection issues to an upstream dependency
    - startup messages
    - garbage collection messages

    For patterns with change points, describe the trend before and after the change point based
    on the data points. E.g.:
    - A persisted drop to near-zero after 2020-01-01T05:00:00.000Z
    - A spike from 10 to 100 at 2020-01-01T05:00:00.000Z, which went back down
    to the average after 2020-01-01T05:02:00.000Z
    - A trend change after 2020-01-01T05:00:00.000Z. The values ranged from 10
    to 20 before, but then after increased from 20 to 100 until
    2020-01-01T05:02:00.000Z.

    Do not:
    - repeat the variables, instead, repeat the constants.
    - repeat the timeseries as a whole, verbatim, in full. However, you can use individual data points + timestamps to illustrate the magnitude of the change, as in the example previously given.
    - make up timestamps.
    - do not separately list individual events if you have already mentioned
    the pattern.
  
  Statistics:

   - ${stats.interestingPatternCount} patterns from ${formatEntity(entity)}
   were collected
   - ${stats.docCount} logs were categorized
   - ${stats.ignoredPatternCount} patterns were deemed uninteresting and accounted
   for ${stats.ignoredDocCount} out of the total amount of logs
  `;

  const response = await inferenceClient.output({
    id: 'describe_log_patterns',
    connectorId,
    system,
    input,
  });

  return {
    ...stats,
    content: response.content,
  };
}
