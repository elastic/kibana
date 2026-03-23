/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import http from 'http';
import getPort from 'get-port';

interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (
    args: Record<string, unknown>
  ) => Promise<{ content: Array<{ type: string; text: string }> }>;
}

interface McpServerSimulatorOptions {
  tools?: McpTool[];
  serverName?: string;
  serverVersion?: string;
}

/**
 * A simple MCP server simulator for FTR tests.
 * Implements the MCP JSON-RPC protocol over HTTP.
 */
export class McpServerSimulator {
  private server: http.Server | null = null;
  private port: number | null = null;
  private tools: Map<string, McpTool> = new Map();
  private serverName: string;
  private serverVersion: string;

  constructor(options: McpServerSimulatorOptions = {}) {
    this.serverName = options.serverName ?? 'mcp-test-server';
    this.serverVersion = options.serverVersion ?? '1.0.0';

    // Register provided tools
    if (options.tools) {
      for (const tool of options.tools) {
        this.tools.set(tool.name, tool);
      }
    }
  }

  /**
   * Register a tool on the MCP server
   */
  registerTool(tool: McpTool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Start the MCP server simulator
   */
  async start(): Promise<string> {
    this.port = await getPort({ port: getPort.makeRange(9200, 9299) });

    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        await this.handleRequest(req, res);
      });

      this.server.listen(this.port, () => {
        resolve(this.getUrl());
      });

      this.server.on('error', reject);
    });
  }

  /**
   * Stop the MCP server simulator
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.server = null;
          this.port = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get the server URL
   */
  getUrl(): string {
    if (!this.port) {
      throw new Error('Server not started');
    }
    return `http://localhost:${this.port}`;
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    // Only handle POST requests
    if (req.method !== 'POST') {
      this.sendJsonRpcError(res, null, -32600, 'Method not allowed', 405);
      return;
    }

    // Check content type
    const contentType = req.headers['content-type'];
    if (!contentType?.includes('application/json')) {
      this.sendJsonRpcError(res, null, -32600, 'Content-Type must be application/json', 415);
      return;
    }

    try {
      const body = await this.readBody(req);
      const message = JSON.parse(body);

      // Handle batch requests
      if (Array.isArray(message)) {
        const responses = await Promise.all(message.map((m) => this.handleJsonRpcMessage(m)));
        const filteredResponses = responses.filter((r) => r !== null);
        if (filteredResponses.length > 0) {
          this.sendResponse(res, 200, filteredResponses);
        } else {
          res.writeHead(202);
          res.end();
        }
        return;
      }

      const response = await this.handleJsonRpcMessage(message);
      if (response === null) {
        // Notification - no response needed
        res.writeHead(202);
        res.end();
      } else {
        this.sendResponse(res, 200, response);
      }
    } catch (error) {
      this.sendJsonRpcError(res, null, -32700, 'Parse error', 400);
    }
  }

  private async handleJsonRpcMessage(message: any): Promise<any | null> {
    const { method, params, id } = message;

    // Notifications don't have an id and don't need a response
    if (id === undefined) {
      return null;
    }

    switch (method) {
      case 'initialize':
        return this.handleInitialize(id, params);
      case 'tools/list':
        return this.handleToolsList(id);
      case 'tools/call':
        return this.handleToolsCall(id, params);
      case 'ping':
        return this.createResponse(id, {});
      default:
        return this.createErrorResponse(id, -32601, `Method not found: ${method}`);
    }
  }

  private handleInitialize(id: string | number, params: any): any {
    // Use the client's requested protocol version if provided, otherwise default
    const clientVersion = params?.protocolVersion ?? '2025-03-26';

    return this.createResponse(id, {
      protocolVersion: clientVersion,
      serverInfo: {
        name: this.serverName,
        version: this.serverVersion,
      },
      capabilities: {
        tools: {},
      },
    });
  }

  private handleToolsList(id: string | number): any {
    const tools = Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));

    return this.createResponse(id, { tools });
  }

  private async handleToolsCall(id: string | number, params: any): Promise<any> {
    const { name, arguments: args } = params;
    const tool = this.tools.get(name);

    if (!tool) {
      return this.createErrorResponse(id, -32602, `Tool not found: ${name}`);
    }

    try {
      const result = await tool.handler(args ?? {});
      return this.createResponse(id, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.createErrorResponse(id, -32000, `Tool execution failed: ${message}`);
    }
  }

  private createResponse(id: string | number, result: any): any {
    return {
      jsonrpc: '2.0',
      id,
      result,
    };
  }

  private createErrorResponse(id: string | number, code: number, message: string): any {
    return {
      jsonrpc: '2.0',
      id,
      error: { code, message },
    };
  }

  private sendResponse(res: http.ServerResponse, statusCode: number, body: any): void {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      'mcp-session-id': 'test-session',
    });
    res.end(JSON.stringify(body));
  }

  private sendJsonRpcError(
    res: http.ServerResponse,
    id: string | number | null,
    code: number,
    message: string,
    statusCode: number
  ): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        jsonrpc: '2.0',
        id,
        error: { code, message },
      })
    );
  }

  private readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => resolve(body));
      req.on('error', reject);
    });
  }
}

/**
 * Create a pre-configured MCP server simulator with common test tools
 */
export function createTestMcpServer(): McpServerSimulator {
  const simulator = new McpServerSimulator({
    serverName: 'test-mcp-server',
    serverVersion: '1.0.0',
  });

  // Add a simple echo tool for testing
  simulator.registerTool({
    name: 'echo',
    description: 'Echoes back the provided message',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'The message to echo' },
      },
      required: ['message'],
    },
    handler: async (args) => ({
      content: [{ type: 'text', text: `Echo: ${args.message}` }],
    }),
  });

  simulator.registerTool({
    name: 'add',
    description: 'Adds two numbers together',
    inputSchema: {
      type: 'object',
      properties: {
        a: { type: 'number', description: 'First number' },
        b: { type: 'number', description: 'Second number' },
      },
      required: ['a', 'b'],
    },
    handler: async (args) => ({
      content: [{ type: 'text', text: String(Number(args.a) + Number(args.b)) }],
    }),
  });

  simulator.registerTool({
    name: 'subtract',
    description: 'Subtracts the second number from the first',
    inputSchema: {
      type: 'object',
      properties: {
        a: { type: 'number', description: 'First number' },
        b: { type: 'number', description: 'Second number to subtract' },
      },
      required: ['a', 'b'],
    },
    handler: async (args) => ({
      content: [{ type: 'text', text: String(Number(args.a) - Number(args.b)) }],
    }),
  });

  simulator.registerTool({
    name: 'multiply',
    description: 'Multiplies two numbers together',
    inputSchema: {
      type: 'object',
      properties: {
        a: { type: 'number', description: 'First number' },
        b: { type: 'number', description: 'Second number' },
      },
      required: ['a', 'b'],
    },
    handler: async (args) => ({
      content: [{ type: 'text', text: String(Number(args.a) * Number(args.b)) }],
    }),
  });

  return simulator;
}
