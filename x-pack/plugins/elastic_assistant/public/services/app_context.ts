/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Conversation } from '@kbn/elastic-assistant';

export type PluginName = string;
export type RegisteredBaseConversationsStorage = Map<PluginName, Record<string, Conversation>>;
export type GetRegisteredBaseConversations = (pluginName: string) => Record<string, Conversation>;

/**
 * Service for managing context specific to the Elastic Assistant
 *
 * Inspired by `AppContextService` impl from fleet plugin: x-pack/plugins/fleet/server/services/app_context.ts
 */
class AppContextService {
  private registeredBaseConversations: RegisteredBaseConversationsStorage = new Map<
    PluginName,
    Record<string, Conversation>
  >();

  public start() {}

  public stop() {
    this.registeredBaseConversations.clear();
  }

  public registerBaseConversations(
    pluginName: string,
    baseConversations: Record<string, Conversation>
  ) {
    if (!this.registeredBaseConversations.has(pluginName)) {
      this.registeredBaseConversations.set(pluginName, {});
    }
    Object.keys(baseConversations).forEach((key) => {
      const conversation = this.registeredBaseConversations.get(pluginName) ?? {};
      conversation[key] = baseConversations[key];
    });
  }

  /**
   * Get the registered tools
   *
   * @param pluginName
   */
  public getRegisteredBaseConversations(pluginName: string): Record<string, Conversation> {
    const baseConversations = this.registeredBaseConversations?.get(pluginName) ?? {};
    return baseConversations;
  }
}

export const appContextService = new AppContextService();
