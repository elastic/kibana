/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StructuredTool } from '@langchain/core/tools';
import type { Logger } from '@kbn/core/server';
import { McpGatewaySession } from './session';
import { GatewayTool } from './types';
import { toLangchainTool } from './utils';

/**
 * Facade on top of the gateway session to handle the logic
 * of which tools should be accessible to which agent(s) or sub-agent(s).
 * Also handles the convertion to langchain world implicitly.
 */
export class ToolsProvider {
  private readonly session: McpGatewaySession;
  private readonly logger: Logger;

  constructor({ session, logger }: { session: McpGatewaySession; logger: Logger }) {
    this.session = session;
    this.logger = logger;
  }

  async getAllTools(): Promise<StructuredTool[]> {
    const allTools = await this.session.listTools();
    return allTools.map((tool) => {
      return this.toLangchainTool(tool);
    });
  }

  async getBuiltInTools(): Promise<StructuredTool[]> {
    // TODO: fix, improve session to add meta on tools and so on
    const allTools = await this.session.listTools();
    return allTools
      .filter((tool) => !tool.name.includes('search'))
      .map((tool) => {
        return this.toLangchainTool(tool);
      });
  }

  async getSearchTools(): Promise<StructuredTool[]> {
    const allTools = await this.session.listTools();
    return allTools
      .filter((tool) => tool.name.includes('search'))
      .map((tool) => {
        return this.toLangchainTool(tool);
      });
  }

  private toLangchainTool(tool: GatewayTool) {
    return toLangchainTool({ tool, session: this.session, logger: this.logger });
  }
}
