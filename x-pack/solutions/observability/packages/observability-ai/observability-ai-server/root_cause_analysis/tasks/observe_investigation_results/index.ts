/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageRole } from '@kbn/inference-common';
import { RCA_OBSERVE_TOOL_NAME } from '@kbn/observability-ai-common/root_cause_analysis';
import { RCA_PROMPT_CHANGES, RCA_PROMPT_ENTITIES, RCA_SYSTEM_PROMPT_BASE } from '../../prompts';
import { ObservationToolMessage, RootCauseAnalysisContext } from '../../types';
import { formatEntity } from '../../util/format_entity';
import { getPreviouslyInvestigatedEntities } from '../../util/get_previously_investigated_entities';
import { stringifySummaries } from '../../util/stringify_summaries';
import { toBlockquote } from '../../util/to_blockquote';
import { EntityInvestigation } from '../investigate_entity/types';

const INITIAL_OBSERVATION_TASK_GUIDE = `Your current task is to write observations based on the initial context. You
should acknowledge the context briefly, and mention key observations from the
initial context. 

Then, briefly describe what change you are looking for. Are the symptoms:

- rapid, or gradual onset?
- subtle or prounounced?

If possible, mention the time of the change.

When considering the initial context, reason about relevant changes to observe,
such as short-lived versus persistent changes or singular events, like scale
events, rollouts, or configuration changes.

After, taking into account the capabilities you have, plan for next steps.

Describe the next step, which is to investigate the entity found in the initial
context. Only mention the entity (as a field/value). Do not mention any
additional filters.

Be brief, accurate, and critical.`;

const INVESTIGATION_ADDENDUM = `
**Task Guide: Observe the investigation results**

You will receive one or more investigations. These investigations mention:
- a general characterization of the entity based on its data
- relevant log patterns
- other signals, like SLOs or alerts
- possibly related entities, and investigation suggestions

First, you should briefly acknowledge the initial context of the investigation
and where it stands. 

Next, you should note key observations from the investigations, and how they relate
to the ongoing investigation. 

After, you should generate a timeline of significant events. For this timeline,
include events from previous observations. Additionally, include significant
events from the inspected investigations. Group events together in a topic
if needed. Significant events are things like: an increase in errors, deployment
events, a drop to zero for access logs, etc. In most cases, you do not want to
mention individual log messages, unless it is a particularly significant event
by itself.

For each event, mention:

- the timestamp of the event
- the nature of the change, if applicable
- data from the event, such as specific log patterns, alerts or slos
- the meaning of the event and how it is related to the initial context

Do not include:
- the time range from the investigation itself (start/end)
- other events that occurred during the investigation itself, like running
log analysis or other patterns

## Correlating significant events

When correlating significant events, pay close attention to the timestamp of
the mentioned change, and how it correlates to the timestamp of the change you
want to correlate it to, such as the start time of an alert. An alert might be
delayed, but if you see many changes around a specific timestamp, and some of
them being significantly earlier, or later, the latter group is likely not
relevant. 

## Context and reasoning

Next, use the timeline of events and the new observations to revise your
analysis of the initial context and the ongoing investigation. Reason about
how changes could be related: are they close in time, or far removed, compared
to others? Is the type of change similar? Is the magnitude of the change similar?`;

const SUGGEST_NEXT_STEPS_PROMPT = `
Next, consider next steps. it's always important to contextualize the significant
in the initial context of the investigation. Focus on your strongest pieces of
evidence. Your observations should be related to finding out the cause of the
initial context of the investigation - you should not concern yourself with the
impact on _other_ entities.

Suggest to conclude the process when:

- there is a clear and obvious root cause
- you have investigated more than 10 entities
- OR you cannot find any unhealthy entities
- there are no more entities to investigate

If the conclusion is you need to continue your investigation, mention the entities
that should be investigated. Do this only if there is a significant change one of
the related entities will give you new insights into the root cause (instead of
just the impact). DO NOT investigate an entity more than once.`;

const CONCLUDE_PROCESS_PROMPT = `
You must suggest to conclude the process and write the final report, as your
capabilities do not allow you go investigate more entities.`;

function getInitialPrompts(initialContext: string) {
  return {
    system: `${RCA_SYSTEM_PROMPT_BASE}

    ${RCA_PROMPT_ENTITIES}

    ${RCA_PROMPT_CHANGES}`,
    input: `## Context
    
    ${initialContext}
    
    ${INITIAL_OBSERVATION_TASK_GUIDE}`,
  };
}

function getObserveInvestigationsPrompts({
  investigations,
  summaries,
  rcaContext,
}: {
  investigations: EntityInvestigation[];
  summaries: ObservationStepSummary[];
  rcaContext: RootCauseAnalysisContext;
}) {
  const previouslyInvestigatedEntities = getPreviouslyInvestigatedEntities(rcaContext);

  const canContinue =
    summaries.length <= 5 &&
    investigations.filter((investigation) => 'summary' in investigation).length <= 10;

  const investigationsPrompt = `Observe the following investigations that recently concluded:
    ${investigations
      .map((investigation, index) => {
        return `## ${index + 1}: investigation of ${formatEntity(investigation.entity)}
      
      ${toBlockquote(investigation.summary)}

      ${
        investigation.relatedEntities.length
          ? `### Relationships to ${formatEntity(investigation.entity)}
      
      ${toBlockquote(JSON.stringify(investigation.relatedEntities))}
      
      `
          : ``
      }
      `;
      })
      .join('\n\n')}
      
  ${INVESTIGATION_ADDENDUM}

  ${
    canContinue
      ? `${SUGGEST_NEXT_STEPS_PROMPT}
  
  ${
    previouslyInvestigatedEntities.length
      ? `The following entities have been investigated previously.
      Do not investigate them again:
  
    ${previouslyInvestigatedEntities.map((entity) => `- ${JSON.stringify(entity)}`).join('\n')}`
      : ``
  }
  
  `
      : CONCLUDE_PROCESS_PROMPT
  }
  
  `;

  const systemPrompt = `${RCA_SYSTEM_PROMPT_BASE}

    ${RCA_PROMPT_ENTITIES}
    
    ${stringifySummaries(rcaContext)}`;

  return {
    system: systemPrompt,
    input: investigationsPrompt,
  };
}

export interface ObservationStepSummary {
  investigations: EntityInvestigation[];
  content: string;
}

export function observeInvestigationResults({
  rcaContext,
  rcaContext: { logger, events, initialContext, inferenceClient, connectorId },
  investigations,
}: {
  rcaContext: RootCauseAnalysisContext;
  investigations: EntityInvestigation[];
}): Promise<ObservationStepSummary> {
  const summaries = events
    .filter((event): event is ObservationToolMessage => {
      return event.role === MessageRole.Tool && event.name === RCA_OBSERVE_TOOL_NAME;
    })
    .map((event) => event.data);

  logger.debug(
    () =>
      `Observing ${investigations.length} investigations (${summaries.length} previous summaries)`
  );

  const { system, input } = investigations.length
    ? getObserveInvestigationsPrompts({ summaries, investigations, rcaContext })
    : getInitialPrompts(initialContext);

  return inferenceClient
    .output({
      id: 'observe',
      system,
      input,
      connectorId,
    })
    .then((outputCompleteEvent) => {
      return {
        content: outputCompleteEvent.content,
        investigations,
      };
    });
}
