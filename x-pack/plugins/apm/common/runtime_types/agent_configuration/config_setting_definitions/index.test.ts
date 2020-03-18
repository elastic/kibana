/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  filterByAgent,
  ConfigSettingDefinition,
  configSettingDefinitions
} from '.';
import { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';

describe('filterByAgent', () => {
  describe('when `excludeAgents` is dotnet and nodejs', () => {
    const setting = {
      key: 'my-setting',
      excludeAgents: ['dotnet', 'nodejs']
    } as ConfigSettingDefinition;

    it('should not include dotnet', () => {
      expect(filterByAgent('dotnet')(setting)).toBe(false);
    });

    it('should include go', () => {
      expect(filterByAgent('go')(setting)).toBe(true);
    });
  });

  describe('when `includeAgents` is dotnet and nodejs', () => {
    const setting = {
      key: 'my-setting',
      includeAgents: ['dotnet', 'nodejs']
    } as ConfigSettingDefinition;

    it('should not include go', () => {
      expect(filterByAgent('go')(setting)).toBe(false);
    });

    it('should include dotnet', () => {
      expect(filterByAgent('dotnet')(setting)).toBe(true);
    });
  });

  describe('RUM agent', () => {
    it('should only display 1 setting (transaction_sample_rate)', () => {
      const definitions = configSettingDefinitions.filter(
        filterByAgent('js-base')
      );
      expect(definitions.length).toEqual(1);
      expect(definitions[0].key).toEqual('transaction_sample_rate');
    });
  });

  describe('stack_trace_limit', () => {
    it('should be listed for java agent', () => {
      expect(hasSetting('java', 'stack_trace_limit')).toBe(true);
    });

    it('should not be listed for nodejs agent', () => {
      expect(hasSetting('nodejs', 'stack_trace_limit')).toBe(false);
    });
  });
});

function hasSetting(agentName: AgentName, settingKey: string) {
  const definitions = configSettingDefinitions.filter(filterByAgent(agentName));
  return definitions.some(def => def.key === settingKey);
}
