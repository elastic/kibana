/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { duplicateRule } from './duplicate_rule';

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

describe('duplicateRule', () => {
  it('should return a copy of rule with new ruleId', () => {
    (uuid.v4 as jest.Mock).mockReturnValue('newId');

    expect(
      duplicateRule(
        {
          id: 'oldTestRuleId',
          notifyWhen: 'onActiveAlert',
          name: 'test',
          tags: ['test', '__internal_rule_id:oldTestRuleId'],
          alertTypeId: 'siem.signals',
          consumer: 'siem',
          params: {
            savedId: undefined,
            author: [],
            description: 'test',
            ruleId: 'oldTestRuleId',
            falsePositives: [],
            from: 'now-360s',
            immutable: false,
            license: '',
            outputIndex: '.siem-signals-default',
            meta: undefined,
            maxSignals: 100,
            riskScore: 42,
            riskScoreMapping: [],
            severity: 'low',
            severityMapping: [],
            threat: [],
            to: 'now',
            references: [],
            version: 1,
            exceptionsList: [],
            type: 'query',
            language: 'kuery',
            index: [],
            query: 'process.args : "chmod"',
            filters: [],
            buildingBlockType: undefined,
            namespace: undefined,
            note: undefined,
            timelineId: undefined,
            timelineTitle: undefined,
            ruleNameOverride: undefined,
            timestampOverride: undefined,
          },
          schedule: {
            interval: '5m',
          },
          enabled: false,
          actions: [],
          throttle: null,
          apiKeyOwner: 'kibana',
          createdBy: 'kibana',
          updatedBy: 'kibana',
          muteAll: false,
          mutedInstanceIds: [],
          updatedAt: new Date(2021, 0),
          createdAt: new Date(2021, 0),
          scheduledTaskId: undefined,
          executionStatus: {
            lastExecutionDate: new Date(2021, 0),
            status: 'ok',
          },
        },
        false
      )
    ).toMatchInlineSnapshot(`
      Object {
        "actions": Array [],
        "alertTypeId": "siem.signals",
        "consumer": "siem",
        "enabled": false,
        "name": "test [Duplicate]",
        "notifyWhen": null,
        "params": Object {
          "author": Array [],
          "buildingBlockType": undefined,
          "description": "test",
          "exceptionsList": Array [],
          "falsePositives": Array [],
          "filters": Array [],
          "from": "now-360s",
          "immutable": false,
          "index": Array [],
          "language": "kuery",
          "license": "",
          "maxSignals": 100,
          "meta": undefined,
          "namespace": undefined,
          "note": undefined,
          "outputIndex": ".siem-signals-default",
          "query": "process.args : \\"chmod\\"",
          "references": Array [],
          "riskScore": 42,
          "riskScoreMapping": Array [],
          "ruleId": "newId",
          "ruleNameOverride": undefined,
          "savedId": undefined,
          "severity": "low",
          "severityMapping": Array [],
          "threat": Array [],
          "timelineId": undefined,
          "timelineTitle": undefined,
          "timestampOverride": undefined,
          "to": "now",
          "type": "query",
          "version": 1,
        },
        "schedule": Object {
          "interval": "5m",
        },
        "tags": Array [
          "test",
          "__internal_rule_id:newId",
          "__internal_immutable:false",
        ],
        "throttle": null,
      }
    `);
  });
});
