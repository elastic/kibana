/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectMigrationContext } from '@kbn/core-saved-objects-server';

import type { AgentPolicy } from '../../../common';

import { migrateAgentPolicyToV8160 } from './to_v8_16_0';

describe('migrateAgentPolicyToV8160', () => {
  it('should migrate advanced_settings.agent_monitoring_http to monitoring_http', () => {
    const agentPolicyDoc: SavedObject<AgentPolicy> = {
      id: 'policy1',
      type: 'ingest-agent-policies',
      references: [],
      attributes: {
        id: 'policy1',
        name: 'Policy 1',
        namespace: 'default',
        advanced_settings: {
          agent_monitoring_http: {
            enabled: true,
            host: 'localhost',
            port: 1111,
            'buffer.enabled': true,
          },
        },
        is_managed: false,
        status: 'active',
        updated_at: '2021-08-17T14:00:00.000Z',
        updated_by: 'elastic',
        revision: 1,
        is_protected: false,
      },
    };

    const migratedAgentPolicyDoc = migrateAgentPolicyToV8160(
      agentPolicyDoc,
      {} as SavedObjectMigrationContext
    );

    expect(migratedAgentPolicyDoc.attributes.monitoring_http).toEqual({
      enabled: true,
      host: 'localhost',
      port: 1111,
      buffer: {
        enabled: true,
      },
    });
    expect(
      migratedAgentPolicyDoc.attributes.advanced_settings?.agent_monitoring_http
    ).toBeUndefined();
  });

  it('should migrate advanced_settings.agent_monitoring_http to monitoring_http when most values are missing', () => {
    const agentPolicyDoc: SavedObject<AgentPolicy> = {
      id: 'policy1',
      type: 'ingest-agent-policies',
      references: [],
      attributes: {
        id: 'policy1',
        name: 'Policy 1',
        namespace: 'default',
        advanced_settings: {
          agent_monitoring_http: {
            enabled: true,
          },
        },
        is_managed: false,
        status: 'active',
        updated_at: '2021-08-17T14:00:00.000Z',
        updated_by: 'elastic',
        revision: 1,
        is_protected: false,
      },
    };

    const migratedAgentPolicyDoc = migrateAgentPolicyToV8160(
      agentPolicyDoc,
      {} as SavedObjectMigrationContext
    );

    expect(migratedAgentPolicyDoc.attributes.monitoring_http).toEqual({
      enabled: true,
    });
    expect(
      migratedAgentPolicyDoc.attributes.advanced_settings?.agent_monitoring_http
    ).toBeUndefined();
  });

  it('should migrate advanced_settings.agent_monitoring_http to monitoring_http when some values are missing', () => {
    const agentPolicyDoc: SavedObject<AgentPolicy> = {
      id: 'policy1',
      type: 'ingest-agent-policies',
      references: [],
      attributes: {
        id: 'policy1',
        name: 'Policy 1',
        namespace: 'default',
        advanced_settings: {
          agent_monitoring_http: {
            enabled: true,
            'buffer.enabled': true,
          },
        },
        is_managed: false,
        status: 'active',
        updated_at: '2021-08-17T14:00:00.000Z',
        updated_by: 'elastic',
        revision: 1,
        is_protected: false,
      },
    };

    const migratedAgentPolicyDoc = migrateAgentPolicyToV8160(
      agentPolicyDoc,
      {} as SavedObjectMigrationContext
    );

    expect(migratedAgentPolicyDoc.attributes.monitoring_http).toEqual({
      enabled: true,
      buffer: {
        enabled: true,
      },
    });
    expect(
      migratedAgentPolicyDoc.attributes.advanced_settings?.agent_monitoring_http
    ).toBeUndefined();
  });
});
