/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CallToolResult, TextContent } from '@modelcontextprotocol/sdk/types.js';
import { ContentRef } from '@kbn/wci-common';

export interface ToolContentResult {
  reference: ContentRef;
  content: Record<string, any>;
}

export interface ContentResultTransportFormat extends TextContent {
  type: 'text';
  reference: ContentRef;
  text: string;
  contentItemType: 'content';
}

export const isContentResultTransportFormat = (
  content: any
): content is ContentResultTransportFormat => {
  return (
    content.type === 'text' &&
    content.contentItemType === 'content' &&
    typeof content.text === 'string' &&
    content.reference != null
  );
};

/**
 * Utility factory to generate MCP call tool results
 */
export const toolResultFactory = {
  contentList: (contents: ToolContentResult[]): CallToolResult => {
    return {
      content: contents.map<ContentResultTransportFormat>((content) => {
        return {
          type: 'text' as const,
          reference: content.reference,
          text: JSON.stringify(content.content),
          contentItemType: 'content' as const,
        };
      }),
    };
  },
  /**
   * Generates a plain text tool response
   */
  text: (text: string): CallToolResult => {
    return {
      content: [
        {
          type: 'text',
          text,
        },
      ],
    };
  },
  /**
   * Generates an error tool response
   */
  error: (message: string): CallToolResult => {
    return {
      content: [
        {
          type: 'text',
          text: `Error during tool execution: ${message}`,
        },
      ],
      isError: true,
    };
  },
};
