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
  AGENT_POLICY_MAPPINGS,
  PACKAGE_POLICIES_MAPPINGS,
  AGENT_MAPPINGS,
  ENROLLMENT_API_KEY_MAPPINGS,
  FLEET_ENROLLMENT_API_PREFIX,
} from '../../constants';

import { validateFilterKueryNode, validateKuery } from './filter_utils';

describe('ValidateFilterKueryNode validates real kueries through KueryNode', () => {
  describe('Agent policies', () => {
    it('Test 1 - search by data_output_id', async () => {
      const astFilter = esKuery.fromKueryExpression(
        `${AGENT_POLICY_SAVED_OBJECT_TYPE}.data_output_id: test_id`
      );
      const validationObject = validateFilterKueryNode({
        astFilter,
        types: [AGENT_POLICY_SAVED_OBJECT_TYPE],
        indexMapping: AGENT_POLICY_MAPPINGS,
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
        indexMapping: AGENT_POLICY_MAPPINGS,
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
        indexMapping: AGENT_POLICY_MAPPINGS,
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
        indexMapping: AGENT_POLICY_MAPPINGS,
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
        indexMapping: AGENT_POLICY_MAPPINGS,
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
        `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.package.name:packageName`
      );
      const validationObject = validateFilterKueryNode({
        astFilter,
        types: [PACKAGE_POLICY_SAVED_OBJECT_TYPE],
        indexMapping: PACKAGE_POLICIES_MAPPINGS,
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
        indexMapping: AGENT_MAPPINGS,
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
      const astFilter = esKuery.fromKueryExpression(
        `${AGENTS_PREFIX}.attributes.agent.id : (id_1 or id_2)`
      );

      const validationObject = validateFilterKueryNode({
        astFilter,
        types: [AGENTS_PREFIX],
        indexMapping: AGENT_MAPPINGS,
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
        indexMapping: AGENT_MAPPINGS,
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
        indexMapping: AGENT_MAPPINGS,
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
        indexMapping: AGENT_MAPPINGS,
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

    it('Test 6 - returns error if kuery is passed without a reference to the index', async () => {
      const astFilter = esKuery.fromKueryExpression(
        `${AGENTS_PREFIX}.status:online or (${AGENTS_PREFIX}.status:updating or ${AGENTS_PREFIX}.status:unenrolling or ${AGENTS_PREFIX}.status:enrolling)`
      );
      const validationObject = validateFilterKueryNode({
        astFilter,
        types: [AGENTS_PREFIX],
        indexMapping: AGENT_MAPPINGS,
        storeValue: true,
      });
      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0',
          error: null,
          isSavedObjectAttr: true,
          key: 'fleet-agents.status',
          type: 'fleet-agents',
        },
        {
          astPath: 'arguments.1.arguments.0',
          error: null,
          isSavedObjectAttr: true,
          key: 'fleet-agents.status',
          type: 'fleet-agents',
        },
        {
          astPath: 'arguments.1.arguments.1',
          error: null,
          isSavedObjectAttr: true,
          key: 'fleet-agents.status',
          type: 'fleet-agents',
        },
        {
          astPath: 'arguments.1.arguments.2',
          error: null,
          isSavedObjectAttr: true,
          key: 'fleet-agents.status',
          type: 'fleet-agents',
        },
      ]);
    });
  });

  describe('Enrollment Api keys', () => {
    it('Test 1', async () => {
      const astFilter = esKuery.fromKueryExpression(
        `${FLEET_ENROLLMENT_API_PREFIX}.policy_id: policyId1`
      );
      const validationObject = validateFilterKueryNode({
        astFilter,
        types: [FLEET_ENROLLMENT_API_PREFIX],
        indexMapping: ENROLLMENT_API_KEY_MAPPINGS,
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

describe('validateKuery validates real kueries', () => {
  describe('Agent policies', () => {
    it('Test 1 - search by data_output_id', async () => {
      const validationObj = validateKuery(
        `${AGENT_POLICY_SAVED_OBJECT_TYPE}.data_output_id: test_id`,
        [AGENT_POLICY_SAVED_OBJECT_TYPE],
        AGENT_POLICY_MAPPINGS
      );
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Invalid kuery', async () => {
      const validationObj = validateKuery(
        'test%3A',
        [AGENT_POLICY_SAVED_OBJECT_TYPE],
        AGENT_POLICY_MAPPINGS
      );
      expect(validationObj?.isValid).toEqual(false);
      expect(validationObj?.error).toContain(
        `KQLSyntaxError: The key is empty and needs to be wrapped by a saved object type like ingest-agent-policies`
      );
    });
  });

  describe('Agents', () => {
    it('Test 1 - search policy id', async () => {
      const validationObj = validateKuery(
        `${AGENTS_PREFIX}.policy_id: "policy_id"`,
        [AGENTS_PREFIX],
        AGENT_MAPPINGS
      );
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Test 2 - invalid kuery', async () => {
      const validationObj = validateKuery(
        `status:online or (status:updating or status:unenrolling or status:enrolling)`,
        [AGENTS_PREFIX],
        AGENT_MAPPINGS
      );
      expect(validationObj?.isValid).toEqual(false);
      expect(validationObj?.error).toContain(
        "KQLSyntaxError: This key 'status' need to be wrapped by a saved object type like fleet-agents"
      );
    });

    it('Test 3 - valid kuery', async () => {
      const validationObj = validateKuery(
        `${AGENTS_PREFIX}.status:online or (${AGENTS_PREFIX}.status:updating or ${AGENTS_PREFIX}.status:unenrolling or ${AGENTS_PREFIX}.status:enrolling)`,
        [AGENTS_PREFIX],
        AGENT_MAPPINGS
      );
      expect(validationObj?.isValid).toEqual(true);
    });
  });

  describe('Package policies', () => {
    it('Test 1 - search by package name', async () => {
      const validationObj = validateKuery(
        `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.package.name:packageName`,
        [PACKAGE_POLICY_SAVED_OBJECT_TYPE],
        PACKAGE_POLICIES_MAPPINGS
      );
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Test 2 - invalid search by package name', async () => {
      const validationObj = validateKuery(
        `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:packageName`,
        [PACKAGE_POLICY_SAVED_OBJECT_TYPE],
        PACKAGE_POLICIES_MAPPINGS
      );
      expect(validationObj?.isValid).toEqual(false);
      expect(validationObj?.error).toEqual(
        `KQLSyntaxError: This key 'ingest-package-policies.package.name' does NOT match the filter proposition SavedObjectType.attributes.key`
      );
    });
  });
});
