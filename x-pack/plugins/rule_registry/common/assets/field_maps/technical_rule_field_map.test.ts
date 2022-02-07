/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { technicalRuleFieldMap } from './technical_rule_field_map';

// This test purely exists to see what the resultant mappings are and
// make it obvious when some dependency results in the mappings changing
it('matches snapshot', () => {
  expect(technicalRuleFieldMap).toMatchInlineSnapshot(`
    Object {
      "@timestamp": Object {
        "array": false,
        "required": true,
        "type": "date",
      },
      "ecs.version": Object {
        "array": false,
        "required": false,
        "type": "keyword",
      },
      "event.action": Object {
        "array": false,
        "required": false,
        "type": "keyword",
      },
      "event.kind": Object {
        "array": false,
        "required": false,
        "type": "keyword",
      },
      "kibana.alert.action_group": Object {
        "array": false,
        "required": false,
        "type": "keyword",
      },
      "kibana.alert.duration.us": Object {
        "type": "long",
      },
      "kibana.alert.end": Object {
        "type": "date",
      },
      "kibana.alert.reason": Object {
        "array": false,
        "required": false,
        "type": "keyword",
      },
      "kibana.alert.risk_score": Object {
        "array": false,
        "required": false,
        "type": "float",
      },
      "kibana.alert.rule.author": Object {
        "array": false,
        "required": false,
        "type": "keyword",
      },
      "kibana.alert.rule.category": Object {
        "array": false,
        "required": true,
        "type": "keyword",
      },
      "kibana.alert.rule.consumer": Object {
        "required": true,
        "type": "keyword",
      },
      "kibana.alert.rule.created_at": Object {
        "array": false,
        "required": false,
        "type": "date",
      },
      "kibana.alert.rule.created_by": Object {
        "array": false,
        "required": false,
        "type": "keyword",
      },
      "kibana.alert.rule.description": Object {
        "array": false,
        "required": false,
        "type": "keyword",
      },
      "kibana.alert.rule.enabled": Object {
        "array": false,
        "required": false,
        "type": "keyword",
      },
      "kibana.alert.rule.execution.uuid": Object {
        "array": false,
        "required": false,
        "type": "keyword",
      },
      "kibana.alert.rule.from": Object {
        "array": false,
        "required": false,
        "type": "keyword",
      },
      "kibana.alert.rule.interval": Object {
        "array": false,
        "required": false,
        "type": "keyword",
      },
      "kibana.alert.rule.license": Object {
        "array": false,
        "required": false,
        "type": "keyword",
      },
      "kibana.alert.rule.name": Object {
        "array": false,
        "required": true,
        "type": "keyword",
      },
      "kibana.alert.rule.note": Object {
        "array": false,
        "required": false,
        "type": "keyword",
      },
      "kibana.alert.rule.parameters": Object {
        "ignore_above": 4096,
        "type": "flattened",
      },
      "kibana.alert.rule.producer": Object {
        "required": true,
        "type": "keyword",
      },
      "kibana.alert.rule.references": Object {
        "array": true,
        "required": false,
        "type": "keyword",
      },
      "kibana.alert.rule.rule_id": Object {
        "array": false,
        "required": false,
        "type": "keyword",
      },
      "kibana.alert.rule.rule_name_override": Object {
        "array": false,
        "required": false,
        "type": "keyword",
      },
      "kibana.alert.rule.rule_type_id": Object {
        "required": true,
        "type": "keyword",
      },
      "kibana.alert.rule.tags": Object {
        "array": true,
        "required": false,
        "type": "keyword",
      },
      "kibana.alert.rule.to": Object {
        "array": false,
        "required": false,
        "type": "keyword",
      },
      "kibana.alert.rule.type": Object {
        "array": false,
        "required": false,
        "type": "keyword",
      },
      "kibana.alert.rule.updated_at": Object {
        "array": false,
        "required": false,
        "type": "date",
      },
      "kibana.alert.rule.updated_by": Object {
        "array": false,
        "required": false,
        "type": "keyword",
      },
      "kibana.alert.rule.uuid": Object {
        "array": false,
        "required": true,
        "type": "keyword",
      },
      "kibana.alert.rule.version": Object {
        "array": false,
        "required": false,
        "type": "keyword",
      },
      "kibana.alert.severity": Object {
        "type": "keyword",
      },
      "kibana.alert.start": Object {
        "type": "date",
      },
      "kibana.alert.status": Object {
        "required": true,
        "type": "keyword",
      },
      "kibana.alert.system_status": Object {
        "array": false,
        "required": false,
        "type": "keyword",
      },
      "kibana.alert.uuid": Object {
        "required": true,
        "type": "keyword",
      },
      "kibana.alert.workflow_reason": Object {
        "array": false,
        "required": false,
        "type": "keyword",
      },
      "kibana.alert.workflow_status": Object {
        "array": false,
        "required": false,
        "type": "keyword",
      },
      "kibana.alert.workflow_user": Object {
        "array": false,
        "required": false,
        "type": "keyword",
      },
      "kibana.space_ids": Object {
        "array": true,
        "required": true,
        "type": "keyword",
      },
      "kibana.version": Object {
        "array": false,
        "required": false,
        "type": "version",
      },
      "tags": Object {
        "array": true,
        "required": false,
        "type": "keyword",
      },
    }
  `);
});
