/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceStart } from '@kbn/core/public';
import type { FeaturesPluginStart, FeaturesPluginSetup } from '@kbn/features-plugin/public';
import type {
  ObservabilitySharedPluginSetup,
  ObservabilitySharedPluginStart,
} from '@kbn/observability-shared-plugin/public';
import type {
  AuthenticatedUser,
  SecurityPluginSetup,
  SecurityPluginStart,
} from '@kbn/security-plugin/public';
import type {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '@kbn/triggers-actions-ui-plugin/public';
import type { Observable } from 'rxjs';
import type { LensPublicSetup, LensPublicStart } from '@kbn/lens-plugin/public';
import type {
  DataViewsPublicPluginSetup,
  DataViewsPublicPluginStart,
} from '@kbn/data-views-plugin/public';
import type { LicensingPluginStart, ILicense } from '@kbn/licensing-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { ForwardRefExoticComponent, RefAttributes } from 'react';
import { WithSuspenseExtendedDeps } from '@kbn/shared-ux-utility';
import { MlPluginSetup, MlPluginStart } from '@kbn/ml-plugin/public';
import type {
  ContextDefinition,
  FunctionDefinition,
  FunctionResponse,
  Message,
} from '../common/types';
import type { ObservabilityAIAssistantAPIClient } from './api';
import type { PendingMessage } from '../common/types';
import type { StreamingChatResponseEvent } from '../common/conversation_complete';
import type { UseGenAIConnectorsResult } from './hooks/use_genai_connectors';
import type { InsightProps } from './components/insight/insight';

/* eslint-disable @typescript-eslint/no-empty-interface*/

export type { CreateChatCompletionResponseChunk } from '../common/types';

export interface ObservabilityAIAssistantChatService {
  analytics: AnalyticsServiceStart;
  chat: (options: {
    messages: Message[];
    connectorId: string;
    function?: 'none' | 'auto';
  }) => Observable<PendingMessage>;
  complete: (options: {
    messages: Message[];
    connectorId: string;
    persist: boolean;
    conversationId?: string;
    signal: AbortSignal;
  }) => Observable<StreamingChatResponseEvent>;
  getContexts: () => ContextDefinition[];
  getFunctions: (options?: { contexts?: string[]; filter?: string }) => FunctionDefinition[];
  hasFunction: (name: string) => boolean;
  hasRenderFunction: (name: string) => boolean;
  renderFunction: (
    name: string,
    args: string | undefined,
    response: { data?: string; content?: string }
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
}) => React.ReactNode;

export type RegisterRenderFunctionDefinition<
  TFunctionArguments = any,
  TFunctionResponse extends FunctionResponse = FunctionResponse
> = (name: string, render: RenderFunction<TFunctionArguments, TFunctionResponse>) => void;

export type ChatRegistrationRenderFunction = ({}: {
  registerRenderFunction: RegisterRenderFunctionDefinition;
}) => Promise<void>;

export interface ConfigSchema {}

export type { PendingMessage };

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
