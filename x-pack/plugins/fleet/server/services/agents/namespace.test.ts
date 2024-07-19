/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Agent } from '../../types';

import { agentsKueryNamespaceFilter, isAgentInNamespace } from './namespace';

describe('isAgentInNamespace', () => {
  describe('when the namespace is defined', () => {
    it('returns true if the agent namespaces include the namespace', () => {
      const agent = { id: '123', namespaces: ['default', 'space1'] } as Agent;
      expect(isAgentInNamespace(agent, 'space1')).toEqual(true);
    });

    it('returns false if the agent namespaces do not include the namespace', () => {
      const agent = { id: '123', namespaces: ['default', 'space1'] } as Agent;
      expect(isAgentInNamespace(agent, 'space2')).toEqual(false);
    });

    it('returns false if the agent has zero length namespaces', () => {
      const agent = { id: '123', namespaces: [] as string[] } as Agent;
      expect(isAgentInNamespace(agent, 'space1')).toEqual(false);
    });

    it('returns false if the agent does not have namespaces', () => {
      const agent = { id: '123' } as Agent;
      expect(isAgentInNamespace(agent, 'space1')).toEqual(false);
    });
  });

  describe('when the namespace is undefined', () => {
    it('returns true if the agent does not have namespaces', () => {
      const agent = { id: '123' } as Agent;
      expect(isAgentInNamespace(agent)).toEqual(true);
    });

    it('returns true if the agent has zero length namespaces', () => {
      const agent = { id: '123', namespaces: [] as string[] } as Agent;
      expect(isAgentInNamespace(agent)).toEqual(true);
    });

    it('returns true if the agent namespaces include the default one', () => {
      const agent = { id: '123', namespaces: ['default'] } as Agent;
      expect(isAgentInNamespace(agent)).toEqual(true);
    });

    it('returns false if the agent namespaces include the default one', () => {
      const agent = { id: '123', namespaces: ['space1'] } as Agent;
      expect(isAgentInNamespace(agent)).toEqual(false);
    });
  });
});

describe('agentsKueryNamespaceFilter', () => {
  it('returns undefined if the namespace is undefined', () => {
    expect(agentsKueryNamespaceFilter()).toBeUndefined();
  });

  it('returns a kuery for the default space', () => {
    expect(agentsKueryNamespaceFilter('default')).toEqual(
      'namespaces:(default) or not namespaces:*'
    );
  });

  it('returns a kuery for custom spaces', () => {
    expect(agentsKueryNamespaceFilter('space1')).toEqual('namespaces:(space1)');
  });
});
