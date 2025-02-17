/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from, Observable, of, switchMap } from 'rxjs';
import { RCA_END_PROCESS_TOOL_NAME } from '@kbn/observability-ai-common/root_cause_analysis';
import { AssistantMessage, MessageRole } from '@kbn/inference-common';
import { writeFinalReport } from './tasks/write_final_report';
import { EndProcessToolMessage, RootCauseAnalysisContext } from './types';
import { generateSignificantEventsTimeline } from './tasks/generate_timeline';
import { EMPTY_ASSISTANT_MESSAGE } from './empty_assistant_message';

export function callEndRcaProcessTool({
  rcaContext,
  toolCallId,
}: {
  rcaContext: RootCauseAnalysisContext;
  toolCallId: string;
}): Observable<EndProcessToolMessage | AssistantMessage> {
  return from(
    writeFinalReport({
      rcaContext,
    })
  ).pipe(
    switchMap((report) => {
      return from(
        generateSignificantEventsTimeline({
          rcaContext,
          report,
        }).then((timeline) => {
          return { timeline, report };
        })
      );
    }),
    switchMap(({ report, timeline }) => {
      const toolMessage: EndProcessToolMessage = {
        name: RCA_END_PROCESS_TOOL_NAME,
        role: MessageRole.Tool,
        toolCallId,
        response: {
          report,
          timeline,
        },
      };
      return of(toolMessage, EMPTY_ASSISTANT_MESSAGE);
    })
  );
}
