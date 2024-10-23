/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_SAVED_OBJECT_TYPE } from '../../..';
import { formatActionToEnqueue } from './format_action_to_enqueue';

describe('formatActionToEnqueue', () => {
  test('should format a rule action as expected', () => {
    expect(
      formatActionToEnqueue({
        action: {
          id: '1',
          group: 'default',
          actionTypeId: 'test',
          params: {
            foo: true,
            contextVal: 'My {{context.value}} goes here',
            stateVal: 'My {{state.value}} goes here',
            alertVal:
              'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
          },
          uuid: '111-111',
        },
        apiKey: 'MTIzOmFiYw==',
        executionId: '123',
        ruleConsumer: 'rule-consumer',
        ruleId: 'aaa',
        ruleTypeId: 'security-rule',
        spaceId: 'default',
      })
    ).toEqual({
      id: '1',
      uuid: '111-111',
      params: {
        foo: true,
        contextVal: 'My {{context.value}} goes here',
        stateVal: 'My {{state.value}} goes here',
        alertVal:
          'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
      },
      spaceId: 'default',
      apiKey: 'MTIzOmFiYw==',
      consumer: 'rule-consumer',
      source: {
        source: {
          id: 'aaa',
          type: RULE_SAVED_OBJECT_TYPE,
        },
        type: 'SAVED_OBJECT',
      },
      executionId: '123',
      relatedSavedObjects: [
        {
          id: 'aaa',
          type: RULE_SAVED_OBJECT_TYPE,
          namespace: undefined,
          typeId: 'security-rule',
        },
      ],
      actionTypeId: 'test',
    });
  });

  test('should format a rule action with null apiKey as expected', () => {
    expect(
      formatActionToEnqueue({
        action: {
          id: '1',
          group: 'default',
          actionTypeId: 'test',
          params: {
            foo: true,
            contextVal: 'My {{context.value}} goes here',
            stateVal: 'My {{state.value}} goes here',
            alertVal:
              'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
          },
          uuid: '111-111',
        },
        apiKey: null,
        executionId: '123',
        ruleConsumer: 'rule-consumer',
        ruleId: 'aaa',
        ruleTypeId: 'security-rule',
        spaceId: 'default',
      })
    ).toEqual({
      id: '1',
      uuid: '111-111',
      params: {
        foo: true,
        contextVal: 'My {{context.value}} goes here',
        stateVal: 'My {{state.value}} goes here',
        alertVal:
          'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
      },
      spaceId: 'default',
      apiKey: null,
      consumer: 'rule-consumer',
      source: {
        source: {
          id: 'aaa',
          type: RULE_SAVED_OBJECT_TYPE,
        },
        type: 'SAVED_OBJECT',
      },
      executionId: '123',
      relatedSavedObjects: [
        {
          id: 'aaa',
          type: RULE_SAVED_OBJECT_TYPE,
          namespace: undefined,
          typeId: 'security-rule',
        },
      ],
      actionTypeId: 'test',
    });
  });

  test('should format a rule action in a custom space as expected', () => {
    expect(
      formatActionToEnqueue({
        action: {
          id: '1',
          group: 'default',
          actionTypeId: 'test',
          params: {
            foo: true,
            contextVal: 'My {{context.value}} goes here',
            stateVal: 'My {{state.value}} goes here',
            alertVal:
              'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
          },
          uuid: '111-111',
        },
        apiKey: 'MTIzOmFiYw==',
        executionId: '123',
        ruleConsumer: 'rule-consumer',
        ruleId: 'aaa',
        ruleTypeId: 'security-rule',
        spaceId: 'my-special-space',
      })
    ).toEqual({
      id: '1',
      uuid: '111-111',
      params: {
        foo: true,
        contextVal: 'My {{context.value}} goes here',
        stateVal: 'My {{state.value}} goes here',
        alertVal:
          'My {{rule.id}} {{rule.name}} {{rule.spaceId}} {{rule.tags}} {{alert.id}} goes here',
      },
      spaceId: 'my-special-space',
      apiKey: 'MTIzOmFiYw==',
      consumer: 'rule-consumer',
      source: {
        source: {
          id: 'aaa',
          type: RULE_SAVED_OBJECT_TYPE,
        },
        type: 'SAVED_OBJECT',
      },
      executionId: '123',
      relatedSavedObjects: [
        {
          id: 'aaa',
          type: RULE_SAVED_OBJECT_TYPE,
          namespace: 'my-special-space',
          typeId: 'security-rule',
        },
      ],
      actionTypeId: 'test',
    });
  });

  test('should format a system action as expected', () => {
    expect(
      formatActionToEnqueue({
        action: {
          id: '1',
          actionTypeId: '.test-system-action',
          params: { myParams: 'test' },
          uuid: 'xxxyyyyzzzz',
        },
        apiKey: 'MTIzOmFiYw==',
        executionId: '123',
        ruleConsumer: 'rule-consumer',
        ruleId: 'aaa',
        ruleTypeId: 'security-rule',
        spaceId: 'default',
      })
    ).toEqual({
      id: '1',
      uuid: 'xxxyyyyzzzz',
      params: { myParams: 'test' },
      spaceId: 'default',
      apiKey: 'MTIzOmFiYw==',
      consumer: 'rule-consumer',
      source: {
        source: {
          id: 'aaa',
          type: RULE_SAVED_OBJECT_TYPE,
        },
        type: 'SAVED_OBJECT',
      },
      executionId: '123',
      relatedSavedObjects: [
        {
          id: 'aaa',
          type: RULE_SAVED_OBJECT_TYPE,
          namespace: undefined,
          typeId: 'security-rule',
        },
      ],
      actionTypeId: '.test-system-action',
    });
  });
});
