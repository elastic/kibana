/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as esKuery from '@kbn/es-query';

import { AGENT_POLICY_SAVED_OBJECT_TYPE } from '../../constants';

import { validateFilterKueryNode } from './filter_utils';

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

const mockMappings = {
  properties: {
    updated_at: {
      type: 'date',
    },
    foo: {
      properties: {
        title: {
          type: 'text',
        },
        description: {
          type: 'text',
        },
        bytes: {
          type: 'integer',
        },
      },
    },
    bar: {
      properties: {
        _id: {
          type: 'keyword',
        },
        foo: {
          type: 'text',
        },
        description: {
          type: 'text',
        },
      },
    },
    bean: {
      properties: {
        canned: {
          fields: {
            text: {
              type: 'text',
            },
          },
          type: 'keyword',
        },
      },
    },
    alert: {
      properties: {
        actions: {
          type: 'nested',
          properties: {
            group: {
              type: 'keyword',
            },
            actionRef: {
              type: 'keyword',
            },
            actionTypeId: {
              type: 'keyword',
            },
            params: {
              enabled: false,
              type: 'object',
            },
          },
        },
        params: {
          type: 'flattened',
        },
      },
    },
    hiddenType: {
      properties: {
        description: {
          type: 'text',
        },
      },
    },
  },
} as const;

describe('Filter Utils', () => {
  describe('ValidateFilterKueryNode', () => {
    describe('Validate general kueries through KueryNode', () => {
      it('Simple filter', () => {
        const validationObject = validateFilterKueryNode({
          astFilter: esKuery.fromKueryExpression(
            'foo.updated_at: 5678654567 and foo.attributes.bytes > 1000 and foo.attributes.bytes < 8000 and foo.attributes.title: "best" and (foo.attributes.description: t* or foo.attributes.description :*)'
          ),
          types: ['foo'],
          indexMapping: mockMappings,
        });

        expect(validationObject).toEqual([
          {
            astPath: 'arguments.0',
            error: null,
            isSavedObjectAttr: true,
            key: 'foo.updated_at',
            type: 'foo',
          },
          {
            astPath: 'arguments.1',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.bytes',
            type: 'foo',
          },
          {
            astPath: 'arguments.2',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.bytes',
            type: 'foo',
          },
          {
            astPath: 'arguments.3',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.title',
            type: 'foo',
          },
          {
            astPath: 'arguments.4.arguments.0',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.description',
            type: 'foo',
          },
          {
            astPath: 'arguments.4.arguments.1',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.description',
            type: 'foo',
          },
        ]);
      });

      it('Nested filter query', () => {
        const validationObject = validateFilterKueryNode({
          astFilter: esKuery.fromKueryExpression(
            'alert.attributes.actions:{ actionTypeId: ".server-log" }'
          ),
          types: ['alert'],
          indexMapping: mockMappings,
          hasNestedKey: true,
        });
        expect(validationObject).toEqual([
          {
            astPath: 'arguments.1',
            error: null,
            isSavedObjectAttr: false,
            key: 'alert.attributes.actions.actionTypeId',
            type: 'alert',
          },
        ]);
      });

      it('Return Error if key is not wrapper by a saved object type', () => {
        const validationObject = validateFilterKueryNode({
          astFilter: esKuery.fromKueryExpression(
            'updated_at: 5678654567 and foo.attributes.bytes > 1000 and foo.attributes.bytes < 8000 and foo.attributes.title: "best" and (foo.attributes.description: t* or foo.attributes.description :*)'
          ),
          types: ['foo'],
          indexMapping: mockMappings,
        });

        expect(validationObject).toEqual([
          {
            astPath: 'arguments.0',
            error: "This key 'updated_at' need to be wrapped by a saved object type like foo",
            isSavedObjectAttr: true,
            key: 'updated_at',
            type: null,
          },
          {
            astPath: 'arguments.1',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.bytes',
            type: 'foo',
          },
          {
            astPath: 'arguments.2',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.bytes',
            type: 'foo',
          },
          {
            astPath: 'arguments.3',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.title',
            type: 'foo',
          },
          {
            astPath: 'arguments.4.arguments.0',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.description',
            type: 'foo',
          },
          {
            astPath: 'arguments.4.arguments.1',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.description',
            type: 'foo',
          },
        ]);
      });

      it('Return Error if key of a saved object type is not wrapped with attributes', () => {
        const validationObject = validateFilterKueryNode({
          astFilter: esKuery.fromKueryExpression(
            'foo.updated_at: 5678654567 and foo.attributes.bytes > 1000 and foo.bytes < 8000 and foo.attributes.title: "best" and (foo.attributes.description: t* or foo.description :*)'
          ),
          types: ['foo'],
          indexMapping: mockMappings,
        });

        expect(validationObject).toEqual([
          {
            astPath: 'arguments.0',
            error: null,
            isSavedObjectAttr: true,
            key: 'foo.updated_at',
            type: 'foo',
          },
          {
            astPath: 'arguments.1',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.bytes',
            type: 'foo',
          },
          {
            astPath: 'arguments.2',
            error:
              "This key 'foo.bytes' does NOT match the filter proposition SavedObjectType.attributes.key",
            isSavedObjectAttr: false,
            key: 'foo.bytes',
            type: 'foo',
          },
          {
            astPath: 'arguments.3',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.title',
            type: 'foo',
          },
          {
            astPath: 'arguments.4.arguments.0',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.description',
            type: 'foo',
          },
          {
            astPath: 'arguments.4.arguments.1',
            error:
              "This key 'foo.description' does NOT match the filter proposition SavedObjectType.attributes.key",
            isSavedObjectAttr: false,
            key: 'foo.description',
            type: 'foo',
          },
        ]);
      });

      it('Return Error if filter is not using an allowed type', () => {
        const validationObject = validateFilterKueryNode({
          astFilter: esKuery.fromKueryExpression(
            'bar.updated_at: 5678654567 and foo.attributes.bytes > 1000 and foo.attributes.bytes < 8000 and foo.attributes.title: "best" and (foo.attributes.description: t* or foo.attributes.description :*)'
          ),
          types: ['foo'],
          indexMapping: mockMappings,
        });

        expect(validationObject).toEqual([
          {
            astPath: 'arguments.0',
            error: 'This type bar is not allowed',
            isSavedObjectAttr: true,
            key: 'bar.updated_at',
            type: 'bar',
          },
          {
            astPath: 'arguments.1',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.bytes',
            type: 'foo',
          },
          {
            astPath: 'arguments.2',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.bytes',
            type: 'foo',
          },
          {
            astPath: 'arguments.3',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.title',
            type: 'foo',
          },
          {
            astPath: 'arguments.4.arguments.0',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.description',
            type: 'foo',
          },
          {
            astPath: 'arguments.4.arguments.1',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.description',
            type: 'foo',
          },
        ]);
      });

      it('Return Error if filter is using an non-existing key in the index patterns of the saved object type', () => {
        const validationObject = validateFilterKueryNode({
          astFilter: esKuery.fromKueryExpression(
            'foo.updated_at33: 5678654567 and foo.attributes.bytes > 1000 and foo.attributes.bytes < 8000 and foo.attributes.header: "best" and (foo.attributes.description: t* or foo.attributes.description :*)'
          ),
          types: ['foo'],
          indexMapping: mockMappings,
        });

        expect(validationObject).toEqual([
          {
            astPath: 'arguments.0',
            error: "This key 'foo.updated_at33' does NOT exist in foo saved object index patterns",
            isSavedObjectAttr: false,
            key: 'foo.updated_at33',
            type: 'foo',
          },
          {
            astPath: 'arguments.1',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.bytes',
            type: 'foo',
          },
          {
            astPath: 'arguments.2',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.bytes',
            type: 'foo',
          },
          {
            astPath: 'arguments.3',
            error:
              "This key 'foo.attributes.header' does NOT exist in foo saved object index patterns",
            isSavedObjectAttr: false,
            key: 'foo.attributes.header',
            type: 'foo',
          },
          {
            astPath: 'arguments.4.arguments.0',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.description',
            type: 'foo',
          },
          {
            astPath: 'arguments.4.arguments.1',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.description',
            type: 'foo',
          },
        ]);
      });

      it('Return Error if filter is using an non-existing key null key', () => {
        const validationObject = validateFilterKueryNode({
          astFilter: esKuery.fromKueryExpression('foo.attributes.description: hello AND bye'),
          types: ['foo'],
          indexMapping: mockMappings,
        });

        expect(validationObject).toEqual([
          {
            astPath: 'arguments.0',
            error: null,
            isSavedObjectAttr: false,
            key: 'foo.attributes.description',
            type: 'foo',
          },
          {
            astPath: 'arguments.1',
            error: 'The key is empty and needs to be wrapped by a saved object type like foo',
            isSavedObjectAttr: false,
            key: null,
            type: null,
          },
        ]);
      });

      it('Multiple nested filter queries', () => {
        const validationObject = validateFilterKueryNode({
          astFilter: esKuery.fromKueryExpression(
            'alert.attributes.actions:{ actionTypeId: ".server-log" AND actionRef: "foo" }'
          ),
          types: ['alert'],
          indexMapping: mockMappings,
        });

        expect(validationObject).toEqual([
          {
            astPath: 'arguments.1.arguments.0',
            error: null,
            isSavedObjectAttr: false,
            key: 'alert.attributes.actions.actionTypeId',
            type: 'alert',
          },
          {
            astPath: 'arguments.1.arguments.1',
            error: null,
            isSavedObjectAttr: false,
            key: 'alert.attributes.actions.actionRef',
            type: 'alert',
          },
        ]);
      });
    });

    describe('Validate real kueries through KueryNode', () => {
      it('Agent policies kuerys - test 1', async () => {
        const validationObject = validateFilterKueryNode({
          astFilter: esKuery.fromKueryExpression(
            `${AGENT_POLICY_SAVED_OBJECT_TYPE}.download_source_id:some_id or (not ${AGENT_POLICY_SAVED_OBJECT_TYPE}.download_source_id:*)`
          ),
          types: [AGENT_POLICY_SAVED_OBJECT_TYPE],
          indexMapping: agentPoliciesMappings,
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

      it('Agent policies kuerys  - test 2', async () => {
        const astFilter = esKuery.fromKueryExpression(
          `${AGENT_POLICY_SAVED_OBJECT_TYPE}.data_output_id: test_id or ${AGENT_POLICY_SAVED_OBJECT_TYPE}.monitoring_output_id: test_id  or (not ${AGENT_POLICY_SAVED_OBJECT_TYPE}.data_output_id:*)`
        );
        const validationObject = validateFilterKueryNode({
          astFilter,
          types: [AGENT_POLICY_SAVED_OBJECT_TYPE],
          indexMapping: agentPoliciesMappings,
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

      it('Agent policies kuerys - test 3', async () => {
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
    });
  });

  // describe('#validateConvertFilterToKueryNode', () => {
  //   describe('Validate real kueries', () => {
  //     it('Agent policies kuerys - test 1', async () => {
  //       const converted = validateConvertFilterToKueryNode(
  //         [AGENT_POLICY_SAVED_OBJECT_TYPE],
  //         `${AGENT_POLICY_SAVED_OBJECT_TYPE}.is_managed:true`,
  //         agentPoliciesMappings
  //       );

  //       expect(validationObject).toEqual(
  //         esKuery.fromKueryExpression(`${AGENT_POLICY_SAVED_OBJECT_TYPE}.is_managed: "true"`)
  //       );
  //     });
  //   });
  // });
});
