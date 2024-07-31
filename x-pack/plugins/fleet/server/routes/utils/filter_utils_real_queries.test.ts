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
} from '../../constants';

import { FLEET_ENROLLMENT_API_PREFIX } from '../../../common/constants';

import { appContextService } from '../../services/app_context';

import { validateFilterKueryNode, validateKuery } from './filter_utils';

jest.mock('../../services/app_context');
const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;

describe('ValidateFilterKueryNode validates real kueries through KueryNode', () => {
  describe('Agent policies', () => {
    it('Search by data_output_id', async () => {
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

    it('Search by inactivity timeout', async () => {
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

    it('Complex query', async () => {
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

    it('Test another complex query', async () => {
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

    it('Returns error if the attribute does not exist', async () => {
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

  describe('Package policies', () => {
    it('Search by package name', async () => {
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

    it('It fails if the kuery is not normalized', async () => {
      const astFilter = esKuery.fromKueryExpression(
        `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:packageName`
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
          error:
            "This key 'ingest-package-policies.package.name' does NOT match the filter proposition SavedObjectType.attributes.key",
          isSavedObjectAttr: false,
          key: 'ingest-package-policies.package.name',
          type: 'ingest-package-policies',
        },
      ]);
    });

    it('It does not check attributes if skipNormalization is passed', async () => {
      const astFilter = esKuery.fromKueryExpression(
        `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:packageName`
      );
      const validationObject = validateFilterKueryNode({
        astFilter,
        types: [PACKAGE_POLICY_SAVED_OBJECT_TYPE],
        indexMapping: PACKAGE_POLICIES_MAPPINGS,
        storeValue: true,
        skipNormalization: true,
      });
      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'ingest-package-policies.package.name',
          type: 'ingest-package-policies',
        },
      ]);
    });

    it('Allows passing query without SO', async () => {
      const astFilter = esKuery.fromKueryExpression(`package.name:packageName`);
      const validationObject = validateFilterKueryNode({
        astFilter,
        types: [PACKAGE_POLICY_SAVED_OBJECT_TYPE],
        indexMapping: PACKAGE_POLICIES_MAPPINGS,
        storeValue: true,
        skipNormalization: true,
      });
      expect(validationObject).toEqual([
        {
          astPath: 'arguments.0',
          error: null,
          isSavedObjectAttr: true,
          key: 'package.name',
          type: 'package',
        },
      ]);
    });
  });

  describe('Agents', () => {
    it('Search policy id', async () => {
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

    it('Search by multiple ids', async () => {
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

    it('Search agent by policy Id and enrolled since more than 10m', async () => {
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

    it('Search agent by multiple policy Ids and tags', async () => {
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

    it('Search agent by multiple tags', async () => {
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

    it('Returns error if kuery is passed without a reference to the index', async () => {
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
    it('Search by version', async () => {
      const astFilter = esKuery.fromKueryExpression(`fleet-agents.agent.version: 8.10.0`);
      const validationObj = validateFilterKueryNode({
        astFilter,
        types: [AGENTS_PREFIX],
        indexMapping: AGENT_MAPPINGS,
        storeValue: true,
        skipNormalization: true,
      });
      expect(validationObj).toEqual([
        {
          astPath: 'arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'fleet-agents.agent.version',
          type: 'fleet-agents',
        },
      ]);
    });
    it('Search by version without SO wrapping', async () => {
      const astFilter = esKuery.fromKueryExpression(`agent.version: 8.10.0`);
      const validationObj = validateFilterKueryNode({
        astFilter,
        types: [AGENTS_PREFIX],
        indexMapping: AGENT_MAPPINGS,
        storeValue: true,
        skipNormalization: true,
      });
      expect(validationObj).toEqual([
        {
          astPath: 'arguments.0',
          error: null,
          isSavedObjectAttr: false,
          key: 'agent.version',
          type: 'agent',
        },
      ]);
    });
  });

  describe('Enrollment API keys', () => {
    it('Search by policy id', async () => {
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
  beforeEach(() => {
    mockedAppContextService.getExperimentalFeatures.mockReturnValue({
      enableStrictKQLValidation: true,
    } as any);
  });
  afterEach(() => {
    mockedAppContextService.getExperimentalFeatures.mockReset();
  });
  describe('Agent policies', () => {
    it('Search by data_output_id', async () => {
      const validationObj = validateKuery(
        `${AGENT_POLICY_SAVED_OBJECT_TYPE}.data_output_id: test_id`,
        [AGENT_POLICY_SAVED_OBJECT_TYPE],
        AGENT_POLICY_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Search by data_output_id without SO wrapping', async () => {
      const validationObj = validateKuery(
        `${AGENT_POLICY_SAVED_OBJECT_TYPE}.data_output_id: test_id`,
        [AGENT_POLICY_SAVED_OBJECT_TYPE],
        AGENT_POLICY_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Search by name', async () => {
      const validationObj = validateKuery(
        `${AGENT_POLICY_SAVED_OBJECT_TYPE}.name: test_id`,
        [AGENT_POLICY_SAVED_OBJECT_TYPE],
        AGENT_POLICY_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Kuery with non existent parameter wrapped by SO', async () => {
      const validationObj = validateKuery(
        `${AGENT_POLICY_SAVED_OBJECT_TYPE}.non_existent_parameter: 'test_id'`,
        [AGENT_POLICY_SAVED_OBJECT_TYPE],
        AGENT_POLICY_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(false);
      expect(validationObj?.error).toContain(
        `KQLSyntaxError: This key 'ingest-agent-policies.non_existent_parameter' does NOT exist in ingest-agent-policies saved object index patterns`
      );
    });

    it('Invalid search by non existent parameter', async () => {
      const validationObj = validateKuery(
        `non_existent_parameter: 'test_id'`,
        [AGENT_POLICY_SAVED_OBJECT_TYPE],
        AGENT_POLICY_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(false);
      expect(validationObj?.error).toContain(
        `KQLSyntaxError: This type 'non_existent_parameter' is not allowed`
      );
    });
  });

  describe('Agents', () => {
    it('Search policy id', async () => {
      const validationObj = validateKuery(
        `${AGENTS_PREFIX}.policy_id: "policy_id"`,
        [AGENTS_PREFIX],
        AGENT_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Status kuery without SO wrapping', async () => {
      const validationObj = validateKuery(
        `status:online or (status:updating or status:unenrolling or status:enrolling)`,
        [AGENTS_PREFIX],
        AGENT_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Status kuery with SO wrapping', async () => {
      const validationObj = validateKuery(
        `${AGENTS_PREFIX}.status:online or (${AGENTS_PREFIX}.status:updating or ${AGENTS_PREFIX}.status:unenrolling or ${AGENTS_PREFIX}.status:enrolling)`,
        [AGENTS_PREFIX],
        AGENT_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Valid kuery without SO wrapping', async () => {
      const validationObj = validateKuery(
        `local_metadata.elastic.agent.version : "8.6.0"`,
        [AGENTS_PREFIX],
        AGENT_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Search by multiple agent ids', async () => {
      const validationObj = validateKuery(
        `${AGENTS_PREFIX}.agent.id : (id_1 or id_2)`,
        [AGENTS_PREFIX],
        AGENT_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Search by complex query', async () => {
      const validationObj = validateKuery(
        `${AGENTS_PREFIX}.policy_id: "policyId" and not (_exists_: "${AGENTS_PREFIX}.unenrolled_at") and ${AGENTS_PREFIX}.enrolled_at >= now-10m`,
        [AGENTS_PREFIX],
        AGENT_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Search by complex query without SO wrapping', async () => {
      const validationObj = validateKuery(
        `policy_id: "policyId" and not (_exists_: "unenrolled_at") and enrolled_at >= now-10m`,
        [AGENTS_PREFIX],
        AGENT_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Search by tags', async () => {
      const validationObj = validateKuery(
        `${AGENTS_PREFIX}.tags: (tag1 or tag2 or tag3)`,
        [AGENTS_PREFIX],
        AGENT_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Search by hostname keyword and status', async () => {
      const validationObj = validateKuery(
        `(${AGENTS_PREFIX}.local_metadata.host.hostname.keyword:test) and (${AGENTS_PREFIX}.status:online)`,
        [AGENTS_PREFIX],
        AGENT_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Search by deeply nested fields', async () => {
      const validationObj = validateKuery(
        `${AGENTS_PREFIX}.local_metadata.os.version.keyword: test`,
        [AGENTS_PREFIX],
        AGENT_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Search by deeply nested fields in local_metadata', async () => {
      const validationObj = validateKuery(
        `${AGENTS_PREFIX}.local_metadata.elastic.agent.build.original.keyword: test`,
        [AGENTS_PREFIX],
        AGENT_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Search by version', async () => {
      const validationObj = validateKuery(
        `agent.version: "8.10.0"`,
        [AGENTS_PREFIX],
        AGENT_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Search by activity', async () => {
      const validationObj = validateKuery(`active: true`, [AGENTS_PREFIX], AGENT_MAPPINGS, true);
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Search by agent.id', async () => {
      const validationObj = validateKuery(`agent.id: id1`, [AGENTS_PREFIX], AGENT_MAPPINGS, true);
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Invalid search by non existent parameter', async () => {
      const validationObj = validateKuery(
        `non_existent_parameter: 'test_id'`,
        [AGENTS_PREFIX],
        AGENT_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(false);
      expect(validationObj?.error).toContain(
        `KQLSyntaxError: This type 'non_existent_parameter' is not allowed`
      );
    });
  });

  describe('Package policies', () => {
    it('Search by package name without SO', async () => {
      const validationObj = validateKuery(
        `package.name:fleet_server`,
        [PACKAGE_POLICY_SAVED_OBJECT_TYPE],
        PACKAGE_POLICIES_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Search by package name', async () => {
      const validationObj = validateKuery(
        `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:fleet_server`,
        [PACKAGE_POLICY_SAVED_OBJECT_TYPE],
        PACKAGE_POLICIES_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Search by package name works with attributes if skipNormalization is not passed', async () => {
      const validationObj = validateKuery(
        `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.attributes.package.name:packageName`,
        [PACKAGE_POLICY_SAVED_OBJECT_TYPE],
        PACKAGE_POLICIES_MAPPINGS
      );
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Search by name and version', async () => {
      const validationObj = validateKuery(
        `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name: "TestName" AND ${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.version: "8.8.0"`,
        [PACKAGE_POLICY_SAVED_OBJECT_TYPE],
        PACKAGE_POLICIES_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Invalid search by nested wrong parameter', async () => {
      const validationObj = validateKuery(
        `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.is_managed:packageName`,
        [PACKAGE_POLICY_SAVED_OBJECT_TYPE],
        PACKAGE_POLICIES_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(false);
      expect(validationObj?.error).toEqual(
        `KQLSyntaxError: This key 'ingest-package-policies.package.is_managed' does NOT exist in ingest-package-policies saved object index patterns`
      );
    });

    it('invalid search by nested wrong parameter - without wrapped SO', async () => {
      const validationObj = validateKuery(
        `package.is_managed:packageName`,
        [PACKAGE_POLICY_SAVED_OBJECT_TYPE],
        PACKAGE_POLICIES_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(false);
      expect(validationObj?.error).toEqual(
        `KQLSyntaxError: This key 'package.is_managed' does NOT exist in ingest-package-policies saved object index patterns`
      );
    });

    it('Invalid search by non existent parameter', async () => {
      const validationObj = validateKuery(
        `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.non_existent_parameter:packageName`,
        [PACKAGE_POLICY_SAVED_OBJECT_TYPE],
        PACKAGE_POLICIES_MAPPINGS
      );
      expect(validationObj?.isValid).toEqual(false);
      expect(validationObj?.error).toEqual(
        `KQLSyntaxError: This key 'ingest-package-policies.non_existent_parameter' does NOT exist in ingest-package-policies saved object index patterns`
      );
    });
  });

  describe('Enrollment keys', () => {
    it('Search by policy id without SO name', async () => {
      const validationObj = validateKuery(
        `policy_id: policyId1`,
        [FLEET_ENROLLMENT_API_PREFIX],
        ENROLLMENT_API_KEY_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Search by policy id', async () => {
      const validationObj = validateKuery(
        `${FLEET_ENROLLMENT_API_PREFIX}.policy_id: policyId1`,
        [FLEET_ENROLLMENT_API_PREFIX],
        ENROLLMENT_API_KEY_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(true);
    });

    it('Search without field parameter', async () => {
      const validationObj = validateKuery(
        `policyId1`,
        [FLEET_ENROLLMENT_API_PREFIX],
        ENROLLMENT_API_KEY_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(true);
      expect(validationObj?.error).toEqual(undefined);
    });
  });
  describe('Feature flag enableStrictKQLValidation', () => {
    beforeEach(() => {
      mockedAppContextService.getExperimentalFeatures.mockReturnValue({
        enableStrictKQLValidation: false,
      } as any);
    });

    it('Allows to skip validation for a free text query', async () => {
      const validationObj = validateKuery(`test`, [AGENTS_PREFIX], AGENT_MAPPINGS, true);
      expect(validationObj?.isValid).toEqual(true);
      expect(validationObj?.error).toEqual(undefined);
    });

    it('Allows to skip validation for a catch all query', async () => {
      const validationObj = validateKuery(`*`, [AGENTS_PREFIX], AGENT_MAPPINGS, true);
      expect(validationObj?.isValid).toEqual(true);
      expect(validationObj?.error).toEqual(undefined);
    });

    it('Allows to skip validation for a disallowed query too', async () => {
      const validationObj = validateKuery(
        `non_existent_parameter: 'test_id'`,
        [AGENTS_PREFIX],
        AGENT_MAPPINGS,
        true
      );
      expect(validationObj?.isValid).toEqual(true);
      expect(validationObj?.error).toEqual(undefined);
    });
  });
});
