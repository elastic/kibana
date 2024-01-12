/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AssistantTool } from '../types';

export type PluginName = string;
export type RegisteredToolsStorage = Map<PluginName, Set<AssistantTool>>;
export type GetRegisteredTools = (pluginName: string) => AssistantTool[];
export interface ElasticAssistantAppContext {
  logger: Logger;
}

/**
 * Service for managing context specific to the Elastic Assistant
 *
 * Inspired by `AppContextService` impl from fleet plugin: x-pack/plugins/fleet/server/services/app_context.ts
 */
class AppContextService {
  private logger: Logger | undefined;
  private registeredTools: RegisteredToolsStorage = new Map<PluginName, Set<AssistantTool>>();

  public start(appContext: ElasticAssistantAppContext) {
    this.logger = appContext.logger;
  }

  public stop() {
    this.registeredTools.clear();
  }

  /**
   * Register tools to be used by the Elastic Assistant
   *
   * @param pluginName
   * @param tools
   */
  public registerTools(pluginName: string, tools: AssistantTool[]) {
    this.logger?.debug('AppContextService:registerTools');
    this.logger?.debug(`pluginName: ${pluginName}`);
    this.logger?.debug(`tools: ${tools.map((tool) => tool.name).join(', ')}`);

    if (!this.registeredTools.has(pluginName)) {
      this.logger?.debug('plugin has no tools, making new set');
      this.registeredTools.set(pluginName, new Set<AssistantTool>());
    }
    tools.forEach((tool) => this.registeredTools.get(pluginName)?.add(tool));
  }

  /**
   * Get the registered tools
   *
   * @param pluginName
   */
  public getRegisteredTools(pluginName: string): AssistantTool[] {
    const tools = Array.from(this.registeredTools?.get(pluginName) ?? new Set<AssistantTool>());

    this.logger?.debug('AppContextService:getRegisteredTools');
    this.logger?.debug(`pluginName: ${pluginName}`);
    this.logger?.debug(`tools: ${tools.map((tool) => tool.name).join(', ')}`);

    return tools;
  }
}

export const appContextService = new AppContextService();
