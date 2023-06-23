/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as esKuery from '@kbn/es-query';

import {
  AGENT_POLICY_SAVED_OBJECT_TYPE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  AGENTS_PREFIX,
} from '../../constants';

import { normalizeKuery } from '../../services/saved_object';

import { validateFilterKueryNode } from './filter_utils';
const FLEET_ENROLLMENT_API_PREFIX = 'fleet-enrollment-api-keys';

const agentPoliciesMappings = {
  properties: {
    name: { type: 'keyword' },
    schema_version: { type: 'version' },
    description: { type: 'text' },
    namespace: { type: 'keyword' },
    is_managed: { type: 'boolean' },
    is_default: { type: 'boolean' },
    is_default_fleet_server: { type: 'boolean' },
    status: { type: 'keyword' },
    unenroll_timeout: { type: 'integer' },
    inactivity_timeout: { type: 'integer' },
    updated_at: { type: 'date' },
    updated_by: { type: 'keyword' },
    revision: { type: 'integer' },
    monitoring_enabled: { type: 'keyword', index: false },
    is_preconfigured: { type: 'keyword' },
    data_output_id: { type: 'keyword' },
    monitoring_output_id: { type: 'keyword' },
    download_source_id: { type: 'keyword' },
    fleet_server_host_id: { type: 'keyword' },
    agent_features: {
      properties: {
        name: { type: 'keyword' },
        enabled: { type: 'boolean' },
      },
    },
    is_protected: { type: 'boolean' },
    overrides: { type: 'flattened', index: false },
  },
} as const;

const packagePoliciesMappings = {
  properties: {
    name: { type: 'keyword' },
    description: { type: 'text' },
    namespace: { type: 'keyword' },
    enabled: { type: 'boolean' },
    is_managed: { type: 'boolean' },
    policy_id: { type: 'keyword' },
    package: {
      properties: {
        name: { type: 'keyword' },
        title: { type: 'keyword' },
        version: { type: 'keyword' },
      },
    },
    elasticsearch: {
      dynamic: false,
      properties: {},
    },
    vars: { type: 'flattened' },
    inputs: {
      dynamic: false,
      properties: {},
    },
    secret_references: { properties: { id: { type: 'keyword' } } },
    revision: { type: 'integer' },
    updated_at: { type: 'date' },
    updated_by: { type: 'keyword' },
    created_at: { type: 'date' },
    created_by: { type: 'keyword' },
  },
} as const;

const agentMappings = {
  properties: {
    access_api_key_id: {
      type: 'keyword',
    },
    action_seq_no: {
      type: 'integer',
      index: false,
    },
    active: {
      type: 'boolean',
    },
    agent: {
      properties: {
        id: {
          type: 'keyword',
        },
        version: {
          type: 'keyword',
        },
      },
    },
    default_api_key: {
      type: 'keyword',
    },
    default_api_key_id: {
      type: 'keyword',
    },
    default_api_key_history: {
      type: 'object',
      enabled: false,
    },
    enrolled_at: {
      type: 'date',
    },
    last_checkin: {
      type: 'date',
    },
    last_checkin_status: {
      type: 'keyword',
    },
    last_checkin_message: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
          ignore_above: 1024,
        },
      },
    },
    components: {
      type: 'object',
      enabled: false,
    },
    last_updated: {
      type: 'date',
    },
    local_metadata: {
      properties: {
        elastic: {
          properties: {
            agent: {
              properties: {
                build: {
                  properties: {
                    original: {
                      type: 'text',
                      fields: {
                        keyword: {
                          type: 'keyword',
                          ignore_above: 256,
                        },
                      },
                    },
                  },
                },
                id: {
                  type: 'keyword',
                },
                log_level: {
                  type: 'keyword',
                },
                snapshot: {
                  type: 'boolean',
                },
                upgradeable: {
                  type: 'boolean',
                },
                version: {
                  type: 'text',
                  fields: {
                    keyword: {
                      type: 'keyword',
                      ignore_above: 16,
                    },
                  },
                },
              },
            },
          },
        },
        host: {
          properties: {
            architecture: {
              type: 'keyword',
            },
            hostname: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            id: {
              type: 'keyword',
            },
            ip: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 64,
                },
              },
            },
            mac: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 17,
                },
              },
            },
            name: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
          },
        },
        os: {
          properties: {
            family: {
              type: 'keyword',
            },
            full: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 128,
                },
              },
            },
            kernel: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 128,
                },
              },
            },
            name: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 256,
                },
              },
            },
            platform: {
              type: 'keyword',
            },
            version: {
              type: 'text',
              fields: {
                keyword: {
                  type: 'keyword',
                  ignore_above: 32,
                },
              },
            },
          },
        },
      },
    },
    packages: {
      type: 'keyword',
    },
    policy_coordinator_idx: {
      type: 'integer',
    },
    policy_id: {
      type: 'keyword',
    },
    policy_revision_idx: {
      type: 'integer',
    },
    shared_id: {
      type: 'keyword',
    },
    enrollment_id: {
      type: 'keyword',
    },
    type: {
      type: 'keyword',
    },
    unenrolled_at: {
      type: 'date',
    },
    unenrollment_started_at: {
      type: 'date',
    },
    updated_at: {
      type: 'date',
    },
    upgrade_started_at: {
      type: 'date',
    },
    upgraded_at: {
      type: 'date',
    },
    user_provided_metadata: {
      type: 'object',
      enabled: false,
    },
    tags: {
      type: 'keyword',
    },
  },
} as const;

const enrollmentApiKeyMappings = {
  properties: {
    active: {
      type: 'boolean',
    },
    api_key: {
      type: 'keyword',
    },
    api_key_id: {
      type: 'keyword',
    },
    created_at: {
      type: 'date',
    },
    expire_at: {
      type: 'date',
    },
    name: {
      type: 'keyword',
    },
    policy_id: {
      type: 'keyword',
    },
    updated_at: {
      type: 'date',
    },
  },
} as const;

describe('ValidateFilterKueryNode validates real kueries through KueryNode', () => {
  describe('Agent policies', () => {
    it('Test 1 - search by data_output_id', async () => {
      const astFilter = esKuery.fromKueryExpression(
        `${AGENT_POLICY_SAVED_OBJECT_TYPE}.data_output_id: test_id`
      );
      const validationObject = validateFilterKueryNode({
        astFilter,
        types: [AGENT_POLICY_SAVED_OBJECT_TYPE],
        indexMapping: agentPoliciesMappings,
        storeValue: true,
      });
      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0',
          error: null,
          isSavedObjectAttr: true,
          key: 'ingest-agent-policies.data_output_id',
          type: 'ingest-agent-policies',
        },
      ]);
    });

    it('Test 2 - search by inactivity timeout', async () => {
      const astFilter = esKuery.fromKueryExpression(
        `${AGENT_POLICY_SAVED_OBJECT_TYPE}.inactivity_timeout:*`
      );
      const validationObject = validateFilterKueryNode({
        astFilter,
        types: [AGENT_POLICY_SAVED_OBJECT_TYPE],
        indexMapping: agentPoliciesMappings,
        storeValue: true,
      });
      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0',
          error: null,
          isSavedObjectAttr: true,
          key: 'ingest-agent-policies.inactivity_timeout',
          type: 'ingest-agent-policies',
        },
      ]);
    });

    it('Test 3 -  complex query', async () => {
      const validationObject = validateFilterKueryNode({
        astFilter: esKuery.fromKueryExpression(
          `${AGENT_POLICY_SAVED_OBJECT_TYPE}.download_source_id:some_id or (not ${AGENT_POLICY_SAVED_OBJECT_TYPE}.download_source_id:*)`
        ),
        types: [AGENT_POLICY_SAVED_OBJECT_TYPE],
        indexMapping: agentPoliciesMappings,
        storeValue: true,
      });

      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0',
          error: null,
          isSavedObjectAttr: true,
          key: 'ingest-agent-policies.download_source_id',
          type: 'ingest-agent-policies',
        },
        {
          astPath: 'arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: true,
          key: 'ingest-agent-policies.download_source_id',
          type: 'ingest-agent-policies',
        },
      ]);
    });

    it('Test 4', async () => {
      const astFilter = esKuery.fromKueryExpression(
        `${AGENT_POLICY_SAVED_OBJECT_TYPE}.data_output_id: test_id or ${AGENT_POLICY_SAVED_OBJECT_TYPE}.monitoring_output_id: test_id  or (not ${AGENT_POLICY_SAVED_OBJECT_TYPE}.data_output_id:*)`
      );
      const validationObject = validateFilterKueryNode({
        astFilter,
        types: [AGENT_POLICY_SAVED_OBJECT_TYPE],
        indexMapping: agentPoliciesMappings,
        storeValue: true,
      });

      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0',
          error: null,
          isSavedObjectAttr: true,
          key: 'ingest-agent-policies.data_output_id',
          type: 'ingest-agent-policies',
        },
        {
          astPath: 'arguments.1',
          error: null,
          isSavedObjectAttr: true,
          key: 'ingest-agent-policies.monitoring_output_id',
          type: 'ingest-agent-policies',
        },
        {
          astPath: 'arguments.2.arguments.0',
          error: null,
          isSavedObjectAttr: true,
          key: 'ingest-agent-policies.data_output_id',
          type: 'ingest-agent-policies',
        },
      ]);
    });

    it('Test 5 - returns error if the attribute does not exist', async () => {
      const astFilter = esKuery.fromKueryExpression(
        `${AGENT_POLICY_SAVED_OBJECT_TYPE}.package_policies:test_id_1 or ${AGENT_POLICY_SAVED_OBJECT_TYPE}.package_policies:test_id_2`
      );
      const validationObject = validateFilterKueryNode({
        astFilter,
        types: [AGENT_POLICY_SAVED_OBJECT_TYPE],
        indexMapping: agentPoliciesMappings,
        storeValue: true,
      });
      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0',
          error:
            "This key 'ingest-agent-policies.package_policies' does NOT exist in ingest-agent-policies saved object index patterns",
          isSavedObjectAttr: false,
          key: 'ingest-agent-policies.package_policies',
          type: 'ingest-agent-policies',
        },
        {
          astPath: 'arguments.1',
          error:
            "This key 'ingest-agent-policies.package_policies' does NOT exist in ingest-agent-policies saved object index patterns",
          isSavedObjectAttr: false,
          key: 'ingest-agent-policies.package_policies',
          type: 'ingest-agent-policies',
        },
      ]);
    });
  });

  describe('Package policies kuerys', () => {
    it('Test 1', async () => {
      const astFilter = esKuery.fromKueryExpression(
        normalizeKuery(
          PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.package.name:packageName`
        )
      );
      const validationObject = validateFilterKueryNode({
        astFilter,
        types: [PACKAGE_POLICY_SAVED_OBJECT_TYPE],
        indexMapping: packagePoliciesMappings,
        storeValue: true,
      });
      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'ingest-package-policies.attributes.package.name',
          type: 'ingest-package-policies',
        },
      ]);
    });
  });

  describe('Agents', () => {
    it('Test 1 - search policy id', async () => {
      const astFilter = esKuery.fromKueryExpression(`${AGENTS_PREFIX}.policy_id: "policy_id"`);
      const validationObject = validateFilterKueryNode({
        astFilter,
        types: [AGENTS_PREFIX],
        indexMapping: agentMappings,
        storeValue: true,
      });
      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0',
          error: null,
          isSavedObjectAttr: true,
          key: 'fleet-agents.policy_id',
          type: 'fleet-agents',
        },
      ]);
    });

    it('Test 2 - search by multiple ids', async () => {
      const normalizedKuery = normalizeKuery(
        `${AGENTS_PREFIX}`,
        `${AGENTS_PREFIX}.attributes.agent.id : (id_1 or id_2)`
      );
      const astFilter = esKuery.fromKueryExpression(normalizedKuery);

      const validationObject = validateFilterKueryNode({
        astFilter,
        types: [AGENTS_PREFIX],
        indexMapping: agentMappings,
        storeValue: true,
      });
      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'fleet-agents.attributes.agent.id',
          type: 'fleet-agents',
        },
        {
          astPath: 'arguments.1',
          error: null,
          isSavedObjectAttr: false,
          key: 'fleet-agents.attributes.agent.id',
          type: 'fleet-agents',
        },
      ]);
    });

    it('Test 3 - search agent by policy Id and enrolled since more than 10m', async () => {
      const astFilter = esKuery.fromKueryExpression(
        `${AGENTS_PREFIX}.policy_id: "policyId" and not (_exists_: "${AGENTS_PREFIX}.unenrolled_at") and ${AGENTS_PREFIX}.enrolled_at >= now-10m`
      );
      const validationObject = validateFilterKueryNode({
        astFilter,
        types: [AGENTS_PREFIX],
        indexMapping: agentMappings,
        storeValue: true,
      });
      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0',
          error: null,
          isSavedObjectAttr: true,
          key: 'fleet-agents.policy_id',
          type: 'fleet-agents',
        },
        {
          astPath: 'arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: '_exists_',
          type: 'searchTerm',
        },
        {
          astPath: 'arguments.2',
          error: null,
          isSavedObjectAttr: true,
          key: 'fleet-agents.enrolled_at',
          type: 'fleet-agents',
        },
      ]);
    });

    it('Test 4 - search agent by multiple policy Ids and tags', async () => {
      const astFilter = esKuery.fromKueryExpression(
        `${AGENTS_PREFIX}.policy_id: (policyId1 or policyId2) and ${AGENTS_PREFIX}.tags: (tag1)`
      );
      const validationObject = validateFilterKueryNode({
        astFilter,
        types: [AGENTS_PREFIX],
        indexMapping: agentMappings,
        storeValue: true,
      });
      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0.arguments.0',
          error: null,
          isSavedObjectAttr: true,
          key: 'fleet-agents.policy_id',
          type: 'fleet-agents',
        },
        {
          astPath: 'arguments.0.arguments.1',
          error: null,
          isSavedObjectAttr: true,
          key: 'fleet-agents.policy_id',
          type: 'fleet-agents',
        },
        {
          astPath: 'arguments.1',
          error: null,
          isSavedObjectAttr: true,
          key: 'fleet-agents.tags',
          type: 'fleet-agents',
        },
      ]);
    });

    it('Test 5 - search agent by multiple tags', async () => {
      const astFilter = esKuery.fromKueryExpression(
        `${AGENTS_PREFIX}.tags: (tag1 or tag2 or tag3)`
      );
      const validationObject = validateFilterKueryNode({
        astFilter,
        types: [AGENTS_PREFIX],
        indexMapping: agentMappings,
        storeValue: true,
      });
      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0',
          error: null,
          isSavedObjectAttr: true,
          key: 'fleet-agents.tags',
          type: 'fleet-agents',
        },
        {
          astPath: 'arguments.1',
          error: null,
          isSavedObjectAttr: true,
          key: 'fleet-agents.tags',
          type: 'fleet-agents',
        },
        {
          astPath: 'arguments.2',
          error: null,
          isSavedObjectAttr: true,
          key: 'fleet-agents.tags',
          type: 'fleet-agents',
        },
      ]);
    });

    // TODO: fix
    // this kuery should work (getAgentStatus)
    it('Test 6 - returns error if kuery is passed without a reference to the index', async () => {
      const astFilter = esKuery.fromKueryExpression(
        `status:online or (status:updating or status:unenrolling or status:enrolling)`
      );
      const validationObject = validateFilterKueryNode({
        astFilter,
        types: [AGENTS_PREFIX],
        indexMapping: agentMappings,
        storeValue: true,
      });
      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0',
          error: "This key 'status' need to be wrapped by a saved object type like fleet-agents",
          isSavedObjectAttr: false,
          key: 'status',
          type: null,
        },
        {
          astPath: 'arguments.1.arguments.0',
          error: "This key 'status' need to be wrapped by a saved object type like fleet-agents",
          isSavedObjectAttr: false,
          key: 'status',
          type: null,
        },
        {
          astPath: 'arguments.1.arguments.1',
          error: "This key 'status' need to be wrapped by a saved object type like fleet-agents",
          isSavedObjectAttr: false,
          key: 'status',
          type: null,
        },
        {
          astPath: 'arguments.1.arguments.2',
          error: "This key 'status' need to be wrapped by a saved object type like fleet-agents",
          isSavedObjectAttr: false,
          key: 'status',
          type: null,
        },
      ]);
    });
  });

  describe('Enrollment Api keys', () => {
    // should also tests kuerys from the search bar
    it('Test 1', async () => {
      const astFilter = esKuery.fromKueryExpression(
        `${FLEET_ENROLLMENT_API_PREFIX}.policy_id: policyId1`
      );
      const validationObject = validateFilterKueryNode({
        astFilter,
        types: [FLEET_ENROLLMENT_API_PREFIX],
        indexMapping: enrollmentApiKeyMappings,
        storeValue: true,
      });
      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0',
          error: null,
          isSavedObjectAttr: true,
          key: 'fleet-enrollment-api-keys.policy_id',
          type: 'fleet-enrollment-api-keys',
        },
      ]);
    });
  });
});
