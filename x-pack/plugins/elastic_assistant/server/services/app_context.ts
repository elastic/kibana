/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { Tool } from 'langchain/tools';
import type { GetApplicableTools, GetApplicableToolsParams } from '../types';

export type PluginName = string;
export type RegisteredToolsStorage = Map<PluginName, GetApplicableTools>;
export type RegisterTools = (pluginName: string, getApplicableTools: GetApplicableTools) => void;
export type GetRegisteredTools = (pluginName: string) => Tool[];

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
  private registeredTools: RegisteredToolsStorage = new Map();

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
   * @param getApplicableTools
   */
  public registerTools(pluginName: string, getApplicableTools: GetApplicableTools) {
    this.logger?.debug('AppContextService:registerTools');
    this.logger?.debug(`pluginName: ${pluginName}`);

    if (!this.registeredTools.has(pluginName)) {
      this.logger?.debug('plugin has no tools, setting "getApplicableTools"');
    } else {
      this.logger?.debug('plugin already has tools, overriding "getApplicableTools"');
    }
    this.registeredTools.set(pluginName, getApplicableTools);
  }

  /**
   * Get the registered tools
   * @param pluginName
   */
  public getRegisteredTools(pluginName: string): GetApplicableTools {
    const getApplicableTools =
      this.registeredTools?.get(pluginName) ?? ((params: GetApplicableToolsParams) => []);

    this.logger?.debug('AppContextService:getRegisteredTools');
    this.logger?.debug(`pluginName: ${pluginName}`);

    return getApplicableTools;
  }
}

export const appContextService = new AppContextService();
