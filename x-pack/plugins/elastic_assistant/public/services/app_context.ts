/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIAssistantDefaults } from '@kbn/elastic-assistant/impl/assistant/prompt_context/types';

export type PluginName = string;
export type RegisteredBaseConversationsStorage = Map<PluginName, AIAssistantDefaults>;
export type GetRegisteredBaseConversations = (pluginName: string) => AIAssistantDefaults;

/**
 * Service for managing context specific to the Elastic Assistant
 *
 * Inspired by `AppContextService` impl from fleet plugin: x-pack/plugins/fleet/server/services/app_context.ts
 */
class AppContextService {
  private registeredAIAssistantDefaults: RegisteredBaseConversationsStorage = new Map<
    PluginName,
    AIAssistantDefaults
  >();

  public start() {}

  public stop() {
    this.registeredAIAssistantDefaults.clear();
  }

  public registerAIAssistantDefaults(pluginName: string, assistantDefaults: AIAssistantDefaults) {
    if (!this.registeredAIAssistantDefaults.has(pluginName)) {
      this.registeredAIAssistantDefaults.set(pluginName, { conversations: {} });
    }
    const defaults = this.registeredAIAssistantDefaults.get(pluginName) ?? { conversations: {} };
    const conversations = assistantDefaults.conversations;
    Object.keys(conversations).forEach((key) => {
      defaults.conversations[key] = conversations[key];
    });
    if (assistantDefaults.quickPrompts) {
      defaults.quickPrompts = assistantDefaults.quickPrompts;
    }
    if (assistantDefaults.systemPrompts) {
      defaults.systemPrompts = assistantDefaults.systemPrompts;
    }
    if (assistantDefaults.title) {
      defaults.title = assistantDefaults.title;
    }
    if (assistantDefaults.allowFields) {
      defaults.allowFields = assistantDefaults.allowFields;
    }
    if (assistantDefaults.allowReplacementFields) {
      defaults.allowReplacementFields = assistantDefaults.allowReplacementFields;
    }
    if (assistantDefaults.allowReplacementFields) {
      defaults.promptContexts = assistantDefaults.promptContexts;
    }
  }

  /**
   * Get the registered tools
   *
   * @param pluginName
   */
  public getRegisteredAIAssistantDefaults(pluginName: string): AIAssistantDefaults {
    const defaults = this.registeredAIAssistantDefaults?.get(pluginName) ?? { conversations: {} };
    return defaults;
  }
}

export const appContextService = new AppContextService();
