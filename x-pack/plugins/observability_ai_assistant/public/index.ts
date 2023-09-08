/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import { lazy } from 'react';
import { withSuspense } from '@kbn/shared-ux-utility';
import { ObservabilityAIAssistantPlugin } from './plugin';
import type {
  ObservabilityAIAssistantPluginSetup,
  ObservabilityAIAssistantPluginStart,
  ObservabilityAIAssistantPluginSetupDependencies,
  ObservabilityAIAssistantPluginStartDependencies,
  ConfigSchema,
} from './types';

export const ContextualInsight = withSuspense(
  lazy(() => import('./components/insight/insight').then((m) => ({ default: m.Insight })))
);

export const ObservabilityAIAssistantActionMenuItem = withSuspense(
  lazy(() =>
    import('./components/action_menu_item/action_menu_item').then((m) => ({
      default: m.ObservabilityAIAssistantActionMenuItem,
    }))
  )
);

export { ObservabilityAIAssistantProvider } from './context/observability_ai_assistant_provider';

export type { ObservabilityAIAssistantPluginSetup, ObservabilityAIAssistantPluginStart };

export {
  useObservabilityAIAssistant,
  useObservabilityAIAssistantOptional,
} from './hooks/use_observability_ai_assistant';

export type { Conversation, Message } from '../common';
export { MessageRole } from '../common';

export type {
  ObservabilityAIAssistantAPIClientRequestParamsOf,
  ObservabilityAIAssistantAPIEndpoint,
  APIReturnType,
} from './api';

export const plugin: PluginInitializer<
  ObservabilityAIAssistantPluginSetup,
  ObservabilityAIAssistantPluginStart,
  ObservabilityAIAssistantPluginSetupDependencies,
  ObservabilityAIAssistantPluginStartDependencies
> = (pluginInitializerContext: PluginInitializerContext<ConfigSchema>) =>
  new ObservabilityAIAssistantPlugin(pluginInitializerContext);
