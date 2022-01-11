/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Ecs } from '../../../common/ecs';

export const mockAADEcsDataWithAlert: Ecs = {
  _id: '1',
  timestamp: '2021-01-10T21:12:47.839Z',
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
  kibana: {
    alert: {
      original_time: ['2021-01-10T21:12:45.839Z'],
      rule: {
        created_at: ['2021-01-10T21:12:47.839Z'],
        updated_at: ['2021-01-10T21:12:47.839Z'],
        created_by: ['elastic'],
        description: ['24/7'],
        enabled: [true],
        false_positives: ['test-1'],
        parameters: {
          filters: [],
          language: ['kuery'],
          query: ['user.id:1'],
        },
        from: ['now-300s'],
        uuid: ['b5ba41ab-aaf3-4f43-971b-bdf9434ce0ea'],
        immutable: [false],
        index: ['auditbeat-*'],
        interval: ['5m'],
        rule_id: ['rule-id-1'],
        output_index: [''],
        max_signals: [100],
        risk_score: ['21'],
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
};

export const getDetectionAlertAADMock = (overrides: Partial<Ecs> = {}): Ecs => ({
  ...mockAADEcsDataWithAlert,
  ...overrides,
});

export const getThresholdDetectionAlertAADMock = (overrides: Partial<Ecs> = {}): Ecs[] => [
  {
    ...mockAADEcsDataWithAlert,
    kibana: {
      alert: {
        ...mockAADEcsDataWithAlert.kibana?.alert,
        rule: {
          ...mockAADEcsDataWithAlert.kibana?.alert?.rule,
          parameters: {
            ...mockAADEcsDataWithAlert.kibana?.alert?.rule?.parameters,
            threshold: {
              field: ['destination.ip'],
              value: 1,
            },
          },
          name: ['mock threshold rule'],
          saved_id: [],
          type: ['threshold'],
          uuid: ['c5ba41ab-aaf3-4f43-971b-bdf9434ce0ea'],
        },
        threshold_result: {
          count: 99,
          from: '2021-01-10T21:11:45.839Z',
          cardinality: [
            {
              field: 'source.ip',
              value: 1,
            },
          ],
          terms: [
            {
              field: 'destination.ip',
              value: 1,
            },
          ],
        },
      },
    },
    ...overrides,
  },
];
