/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { Observable } from 'rxjs';
import type { Conversation } from '@kbn/elastic-assistant';
import { DATA_QUALITY_DASHBOARD_CONVERSATION_ID } from '@kbn/ecs-data-quality-dashboard/impl/data_quality/data_quality_panel/tabs/summary_tab/callout_summary/translations';

export type ContractComponentName = 'getStarted' | 'dashboardsLandingCallout';

export type SetAssistantBaseConversations = (
  assistantBaseConversations: Record<string, Conversation>
) => void;
export type GetAssistantBaseConversations = () => Observable<Record<string, Conversation>>;
export type IsValidConversationId = (conversationId: string | null | undefined) => boolean;

export class ContractAssistantConversationService {
  private assistantBaseConversationsSubject$: BehaviorSubject<Record<string, Conversation>>;
  private assistantBaseConversations$: Observable<Record<string, Conversation>>;
  private assistantBaseConversations: Record<string, Conversation> | null;

  constructor() {
    this.assistantBaseConversationsSubject$ = new BehaviorSubject<Record<string, Conversation>>({});
    this.assistantBaseConversations$ = this.assistantBaseConversationsSubject$.asObservable();
    this.assistantBaseConversations = null;
  }

  public setAssistantBaseConversations: SetAssistantBaseConversations = (
    assistantBaseConversations
  ) => {
    this.assistantBaseConversationsSubject$.next(assistantBaseConversations);
    this.assistantBaseConversations = assistantBaseConversations;
  };

  public getAssistantBaseConversations: GetAssistantBaseConversations = () =>
    this.assistantBaseConversations$;

  private hasDataQualityInBaseConversations = () => {
    return (
      this.assistantBaseConversations != null &&
      this.assistantBaseConversations[DATA_QUALITY_DASHBOARD_CONVERSATION_ID] != null
    );
  };

  public isValidConversationId: IsValidConversationId = (conversationId) => {
    if (!this.hasDataQualityInBaseConversations()) {
      return conversationId !== DATA_QUALITY_DASHBOARD_CONVERSATION_ID;
    }
    return true;
  };
}
