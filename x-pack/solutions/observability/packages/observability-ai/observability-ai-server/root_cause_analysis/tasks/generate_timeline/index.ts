/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RCA_SYSTEM_PROMPT_BASE } from '../../prompts';
import { RootCauseAnalysisContext } from '../../types';
import { stringifySummaries } from '../../util/stringify_summaries';

type SignificantEventSeverity = 'info' | 'unusual' | 'warning' | 'critical';

type SignificantEventType = 'alert' | 'slo' | 'event';

export interface SignificantEvent {
  severity: SignificantEventSeverity;
  '@timestamp'?: string;
  description: string;
  type: SignificantEventType;
}

export interface SignificantEventsTimeline {
  events: SignificantEvent[];
}

export async function generateSignificantEventsTimeline({
  report,
  rcaContext,
}: {
  report: string;
  rcaContext: RootCauseAnalysisContext;
}): Promise<SignificantEventsTimeline> {
  const { connectorId, inferenceClient } = rcaContext;

  return await inferenceClient
    .output({
      id: 'generate_timeline',
      system: RCA_SYSTEM_PROMPT_BASE,
      connectorId,
      input: `Your current task is to generate a timeline
        of significant events, based on the given RCA report,
        according to a structured schema. This timeline will
        be presented to the user as a visualization.

        ${stringifySummaries(rcaContext)}

        # Report

        ${report}
    `,
      schema: {
        type: 'object',
        properties: {
          events: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                timestamp: {
                  type: 'string',
                  description: 'The ISO timestamp of when the event occurred',
                },
                severity: {
                  type: 'string',
                  enum: ['info', 'unusual', 'warning', 'critical'],
                },
                type: {
                  type: 'string',
                  enum: ['alert', 'slo', 'event'],
                },
                description: {
                  type: 'string',
                  description: 'A description of the event',
                },
              },
              required: ['severity', 'description'],
            },
          },
        },
        required: ['events'],
      } as const,
    })
    .then((timelineCompleteEvent) => {
      return {
        events: timelineCompleteEvent.output.events.map((event) => {
          return {
            '@timestamp': event.timestamp,
            severity: event.severity,
            type: event.type ?? 'event',
            description: event.description,
          };
        }),
      };
    });
}
