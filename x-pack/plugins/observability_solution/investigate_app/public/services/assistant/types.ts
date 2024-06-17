/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  InvestigationRevision,
  InvestigateWidgetCreate,
} from '@kbn/investigate-plugin/common';
import { Observable } from 'rxjs';
import type {
  ObservabilityAIAssistantChatService,
  ChatCompletionChunkEvent,
} from '@kbn/observability-ai-assistant-plugin/public';
import type { Moment } from 'moment';

export type AskChatFunction = (
  name: string,
  options: Omit<
    Parameters<ObservabilityAIAssistantChatService['chat']>[1],
    'connectorId' | 'signal'
  >
) => Observable<ChatCompletionChunkEvent>;

export enum TimelineAskUpdateType {
  Status = 'status',
  Widget = 'widget',
}

export enum TimelineAskStatusUpdateType {
  CollectingContext = 'collectingContext',
  AnalyzingVisualizations = 'analyzingVisualizations',
  GeneratingWidgets = 'generatingWidgets',
}

type TimelineAskUpdateBase<
  TType extends TimelineAskUpdateType,
  TMeta extends Record<string, any>
> = {
  type: TType;
} & TMeta;

export type TimelineAskStatusUpdate = TimelineAskUpdateBase<
  TimelineAskUpdateType.Status,
  { status: { message: string; type: TimelineAskStatusUpdateType } }
>;

export type TimelineAskWidgetUpdate = TimelineAskUpdateBase<
  TimelineAskUpdateType.Widget,
  { widget: { create: InvestigateWidgetCreate<Record<string, any>> } }
>;

export type TimelineAskUpdate = TimelineAskStatusUpdate | TimelineAskWidgetUpdate;

export interface AssistantService {
  ask: (options: {
    prompt: string;
    revision: InvestigationRevision;
    signal: AbortSignal;
    connectorId: string;
    start: Moment;
    end: Moment;
  }) => Observable<TimelineAskUpdate>;
}
