/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceClient } from '@kbn/inference-common';
import { RCA_PROMPT_SIGNIFICANT_EVENTS, RCA_SYSTEM_PROMPT_BASE } from '../../prompts';
import { formatEntity } from '../../util/format_entity';
import { toBlockquote } from '../../util/to_blockquote';
import { LogPatternDescription } from '../describe_log_patterns';
import { getInvestigateEntityTaskPrompt } from '../investigate_entity/prompts';

export async function writeEntityInvestigationReport({
  inferenceClient,
  connectorId,
  entity,
  contextForEntityInvestigation,
  entityDescription,
  logPatternDescription,
}: {
  inferenceClient: InferenceClient;
  connectorId: string;
  entity: Record<string, string>;
  contextForEntityInvestigation: string;
  entityDescription: string;
  logPatternDescription: LogPatternDescription;
}): Promise<string> {
  const system = RCA_SYSTEM_PROMPT_BASE;

  const shouldGenerateTimeline = logPatternDescription.interestingPatternCount > 0;

  let input = `${getInvestigateEntityTaskPrompt({ entity, contextForEntityInvestigation })}

  ## Entity description

  ${toBlockquote(entityDescription)}

  ## Log pattern analysis

  ${toBlockquote(logPatternDescription.content)}

  # Current task

  Your current task is to write a report the investigation into ${formatEntity(entity)}.
  The log pattern analysis and entity description will be added to your report (at the
  top), so you don't need to repeat anything in it.`;

  if (shouldGenerateTimeline) {
    input += `${RCA_PROMPT_SIGNIFICANT_EVENTS}\n\n`;
  }

  input += `## Context and reasoning

  Reason about the role that the entity plays in the investigation, given the context.
  mention evidence (hard pieces of data) when reasoning.
  
  Do not suggest next steps - this will happen in a follow-up task.`;

  if (shouldGenerateTimeline) {
    input += `## Format
    
    Your reply should only contain two sections: 
    
    - Timeline of significant events
    - Context and reasoning
    `;
  } else {
    input += `## Format
    Your reply should only contain one section:
    - Context and reasoning
    `;
  }

  const response = await inferenceClient.output({
    id: 'generate_entity_report',
    connectorId,
    input,
    system,
  });

  return response.content;
}
