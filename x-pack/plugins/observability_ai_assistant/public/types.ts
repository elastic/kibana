/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceStart } from '@kbn/core/public';
import type { FeaturesPluginStart, FeaturesPluginSetup } from '@kbn/features-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type {
  DataViewsPublicPluginSetup,
  DataViewsPublicPluginStart,
} from '@kbn/data-views-plugin/public';
import type { LensPublicSetup, LensPublicStart } from '@kbn/lens-plugin/public';
import type { ILicense, LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { MlPluginSetup, MlPluginStart } from '@kbn/ml-plugin/public';
import type {
  ObservabilitySharedPluginSetup,
  ObservabilitySharedPluginStart,
} from '@kbn/observability-shared-plugin/public';
import type {
  AuthenticatedUser,
  SecurityPluginSetup,
  SecurityPluginStart,
} from '@kbn/security-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { WithSuspenseExtendedDeps } from '@kbn/shared-ux-utility';
import type {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '@kbn/triggers-actions-ui-plugin/public';
import { ForwardRefExoticComponent, RefAttributes } from 'react';
import type { Observable } from 'rxjs';
import type { StreamingChatResponseEventWithoutError } from '../common/conversation_complete';
import type {
  ContextDefinition,
  FunctionDefinition,
  FunctionResponse,
  Message,
  PendingMessage,
} from '../common/types';
import type { ChatActionClickHandler, ChatFlyoutSecondSlotHandler } from './components/chat/types';
import type { ObservabilityAIAssistantAPIClient } from './api';
import type { InsightProps } from './components/insight/insight';
import type { UseGenAIConnectorsResult } from './hooks/use_genai_connectors';

/* eslint-disable @typescript-eslint/no-empty-interface*/

export type { CreateChatCompletionResponseChunk } from '../common/types';
export type { PendingMessage };

export interface ObservabilityAIAssistantChatService {
  analytics: AnalyticsServiceStart;
  chat: (
    name: string,
    options: {
      messages: Message[];
      connectorId: string;
      function?: 'none' | 'auto';
      signal: AbortSignal;
    }
  ) => Observable<StreamingChatResponseEventWithoutError>;
  complete: (options: {
    messages: Message[];
    connectorId: string;
    persist: boolean;
    conversationId?: string;
    signal: AbortSignal;
  }) => Observable<StreamingChatResponseEventWithoutError>;
  getContexts: () => ContextDefinition[];
  getFunctions: (options?: { contexts?: string[]; filter?: string }) => FunctionDefinition[];
  hasFunction: (name: string) => boolean;
  hasRenderFunction: (name: string) => boolean;
  renderFunction: (
    name: string,
    args: string | undefined,
    response: { data?: string; content?: string },
    onActionClick: ChatActionClickHandler,
    chatFlyoutSecondSlotHandler?: ChatFlyoutSecondSlotHandler
  ) => React.ReactNode;
}

export interface ObservabilityAIAssistantService {
  isEnabled: () => boolean;
  callApi: ObservabilityAIAssistantAPIClient;
  getCurrentUser: () => Promise<AuthenticatedUser>;
  getLicense: () => Observable<ILicense>;
  getLicenseManagementLocator: () => SharePluginStart;
  start: ({}: { signal: AbortSignal }) => Promise<ObservabilityAIAssistantChatService>;
  register: (fn: ChatRegistrationRenderFunction) => void;
}

export type RenderFunction<TArguments, TResponse extends FunctionResponse> = (options: {
  arguments: TArguments;
  response: TResponse;
  onActionClick: ChatActionClickHandler;
  chatFlyoutSecondSlotHandler?: ChatFlyoutSecondSlotHandler;
}) => React.ReactNode;

export type RegisterRenderFunctionDefinition<
  TFunctionArguments = any,
  TFunctionResponse extends FunctionResponse = FunctionResponse
> = (name: string, render: RenderFunction<TFunctionArguments, TFunctionResponse>) => void;

export type ChatRegistrationRenderFunction = ({}: {
  registerRenderFunction: RegisterRenderFunctionDefinition;
}) => Promise<void>;

export interface ConfigSchema {}

export interface ObservabilityAIAssistantPluginSetupDependencies {
  dataViews: DataViewsPublicPluginSetup;
  features: FeaturesPluginSetup;
  lens: LensPublicSetup;
  observabilityShared: ObservabilitySharedPluginSetup;
  security: SecurityPluginSetup;
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
  ml: MlPluginSetup;
}

export interface ObservabilityAIAssistantPluginStartDependencies {
  dataViews: DataViewsPublicPluginStart;
  features: FeaturesPluginStart;
  lens: LensPublicStart;
  licensing: LicensingPluginStart;
  observabilityShared: ObservabilitySharedPluginStart;
  security: SecurityPluginStart;
  share: SharePluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  uiActions: UiActionsStart;
  ml: MlPluginStart;
}

export interface ObservabilityAIAssistantPluginSetup {}

export interface ObservabilityAIAssistantPluginStart {
  service: ObservabilityAIAssistantService;
  ObservabilityAIAssistantContextualInsight: React.ForwardRefExoticComponent<InsightProps> | null;
  ObservabilityAIAssistantActionMenuItem: ForwardRefExoticComponent<
    Pick<RefAttributes<{}> & WithSuspenseExtendedDeps, 'css' | 'key' | 'analytics'> &
      RefAttributes<{}>
  > | null;
  useGenAIConnectors: () => UseGenAIConnectorsResult;
}
