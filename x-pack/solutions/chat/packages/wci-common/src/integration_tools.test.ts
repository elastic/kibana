/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildToolName, parseToolName, ToolNameAndIntegrationId } from './integration_tools';

describe('integration_tools', () => {
  describe('buildToolName', () => {
    it('should correctly concatenate toolName and integrationId', () => {
      const input: ToolNameAndIntegrationId = {
        toolName: 'searchTool',
        integrationId: 'elastic-search-123',
      };
      expect(buildToolName(input)).toBe('searchTool___elastic-search-123');
    });

    it('should handle special characters in input', () => {
      const input: ToolNameAndIntegrationId = {
        toolName: 'special@#$!%',
        integrationId: 'integration&^*()',
      };
      expect(buildToolName(input)).toBe('special@#$!%___integration&^*()');
    });
  });

  describe('parseToolName', () => {
    it('should correctly parse a valid tool name', () => {
      const fullToolName = 'searchTool___elastic-search-123';
      expect(parseToolName(fullToolName)).toEqual({
        toolName: 'searchTool',
        integrationId: 'elastic-search-123',
      });
    });

    it.skip('should throw an error for invalid tool name format', () => {
      expect(() => parseToolName('invalidToolName')).toThrow(
        'Invalid tool name format : "invalidToolName"'
      );
    });

    it.skip('should throw an error when there are too many separators', () => {
      expect(() => parseToolName('tool___integration___extra')).toThrow(
        'Invalid tool name format : "tool___integration___extra"'
      );
    });
  });
});
