/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';

export const getDetectionAlertMock = (overrides: Partial<Ecs> = {}): Ecs => ({
  ...{
    _id: '1',
    timestamp: '2018-11-05T19:03:25.937Z',
    host: {
      name: ['apache'],
      ip: ['192.168.0.1'],
    },
    event: {
      id: ['1'],
      action: ['Action'],
      category: ['Access'],
      module: ['nginx'],
      severity: [3],
      kind: ['signal'],
    },
    source: {
      ip: ['192.168.0.1'],
      port: [80],
    },
    destination: {
      ip: ['192.168.0.3'],
      port: [6343],
    },
    user: {
      id: ['1'],
      name: ['john.dee'],
    },
    geo: {
      region_name: ['xx'],
      country_iso_code: ['xx'],
    },
    signal: {
      rule: {
        created_at: ['2020-01-10T21:11:45.839Z'],
        updated_at: ['2020-01-10T21:11:45.839Z'],
        created_by: ['elastic'],
        description: ['24/7'],
        enabled: [true],
        false_positives: ['test-1'],
        filters: [],
        from: ['now-300s'],
        id: ['b5ba41ab-aaf3-4f43-971b-bdf9434ce0ea'],
        immutable: [false],
        index: ['auditbeat-*'],
        interval: ['5m'],
        rule_id: ['rule-id-1'],
        language: ['kuery'],
        output_index: ['.siem-signals-default'],
        max_signals: [100],
        risk_score: ['21'],
        query: ['user.name: root or user.name: admin'],
        references: ['www.test.co'],
        saved_id: ["Garrett's IP"],
        timeline_id: ['1234-2136-11ea-9864-ebc8cc1cb8c2'],
        timeline_title: ['Untitled timeline'],
        severity: ['low'],
        updated_by: ['elastic'],
        tags: [],
        to: ['now'],
        type: ['saved_query'],
        threat: [],
        note: ['# this is some markdown documentation'],
        version: ['1'],
      },
    },
  },
  ...overrides,
});

export const mockEcsDataWithAlert: Ecs = getDetectionAlertMock();

export const getThreatMatchDetectionAlert = (overrides: Partial<Ecs> = {}): Ecs => ({
  ...mockEcsDataWithAlert,
  signal: {
    ...mockEcsDataWithAlert.signal,
    rule: {
      ...mockEcsDataWithAlert.rule,
      name: ['mock threat_match rule'],
      type: ['threat_match'],
    },
  },
  threat: {
    enrichments: [
      {
        matched: {
          atomic: ['matched.atomic'],
          field: ['matched.atomic'],
          type: ['matched.domain'],
        },
      },
    ],
  },
  ...overrides,
});
