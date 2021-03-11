/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Example data from Whimsical wireframes: https://whimsical.com/observability-alerting-user-journeys-8TFDcHRPMQDJgtLpJ7XuBj
 */
export const wireframeData = [
  {
    '@timestamp': 1615392661000,
    duration: '10 min 2 s',
    severity: '-',
    reason: 'Error count is greater than 100 (current value is 135) on shippingService',
    service: { name: 'opbeans-go' },
    affectedEntity: 'opbeans-go service',
    status: 'Active',
    expectedValue: '< 100',
    actualValue: '135',
    severityLog: [
      { '@timestamp': 1615392661000, severity: 'critical', message: 'Load is 3.5' },
      { '@timestamp': 1615392600000, severity: 'warning', message: 'Load is 2.5' },
      { '@timestamp': 1615392552000, severity: 'critical', message: 'Load is 3.5' },
    ],
    type: 'APM Error count',
  },
  {
    '@timestamp': 1615392600000,
    duration: '11 min 1 s',
    severity: '-',
    reason: 'Latency is greater than 1500ms (current value is 1700ms) on frontend',
    service: { name: 'opbeans-go' },
    severityLog: [],
  },
  {
    '@timestamp': 1615392552000,
    duration: '10 min 2 s',
    severity: 'critical',
    reason: 'Latency anomaly score is 84 on checkoutService',
    service: { name: 'opbeans-go' },
    severityLog: [],
  },
  {
    '@timestamp': 1615392391000,
    duration: '10 min 2 s',
    severity: '-',
    reason:
      'CPU is greater than a threshold of 75% (current value is 83%) on gke-eden-3-prod-pool-2-395ef018-06xg',
    pod: 'gke-dev-oblt-dev-oblt-pool-30f1ba48-skw',
    severityLog: [],
  },
  {
    '@timestamp': 1615392363000,
    duration: '10 min 2 s',
    severity: '-',
    reason:
      "Log count with 'Log.level.error' and 'service.name; frontend' is greater than 75 (current value 122)",
    log: true,
    severityLog: [],
  },
  {
    '@timestamp': 1615392361000,
    duration: '10 min 2 s',
    severity: 'critical',
    reason: 'Load is greater than 2 (current value is 3.5) on gke-eden-3-prod-pool-2-395ef018-06xg',
    pod: 'gke-dev-oblt-dev-oblt-pool-30f1ba48-skw',
    severityLog: [],
  },
];

/**
 * Example data from this proof of concept: https://github.com/dgieselaar/kibana/tree/alerting-event-log-poc
 */
export const eventLogPocData = [
  {
    '@timestamp': 1615395754597,
    first_seen: 1615362488702,
    severity: 'warning',
    severity_value: 1241.4546,
    reason:
      'Transaction duration for opbeans-java/request in production was above the threshold of 1.0 ms (1.2 ms)',
    rule_id: 'cb1fc3e0-7fef-11eb-827d-d94e80a23d8d',
    rule_name: 'Latency threshold | opbeans-java',
    rule_type_id: 'apm.transaction_duration',
    rule_type_name: 'Latency threshold',
    alert_instance_title: ['opbeans-java/request:production'],
    alert_instance_name: 'apm.transaction_duration_production',
    unique: 1,
    group_by_field: 'alert_instance.uuid',
    group_by_value: '1b354805-4bf3-4626-b6be-5801d7d1e256',
    influencers: [
      'service.name:opbeans-java',
      'service.environment:production',
      'transaction.type:request',
    ],
    fields: {
      'processor.event': 'transaction',
      'service.name': 'opbeans-java',
      'service.environment': 'production',
      'transaction.type': 'request',
    },
    timeseries: [
      {
        x: 1615359600000,
        y: 48805,
        threshold: 1000,
      },
      {
        x: 1615370400000,
        y: 3992.5,
        threshold: 1000,
      },
      {
        x: 1615381200000,
        y: 4296.7998046875,
        threshold: 1000,
      },
      {
        x: 1615392000000,
        y: 1633.8182373046875,
        threshold: 1000,
      },
    ],
    recovered: false,
  },
  {
    '@timestamp': 1615326143423,
    first_seen: 1615323802378,
    severity: 'warning',
    severity_value: 27,
    reason: 'Error count for opbeans-node in production was above the threshold of 2 (27)',
    rule_id: '335b38d0-80be-11eb-9fd1-d3725789930d',
    rule_name: 'Error count threshold',
    rule_type_id: 'apm.error_rate',
    rule_type_name: 'Error count threshold',
    alert_instance_title: ['opbeans-node:production'],
    alert_instance_name: 'opbeans-node_production',
    unique: 1,
    group_by_field: 'alert_instance.uuid',
    group_by_value: '19165a4f-296a-4045-9448-40c793d97d02',
    influencers: ['service.name:opbeans-node', 'service.environment:production'],
    fields: {
      'processor.event': 'error',
      'service.name': 'opbeans-node',
      'service.environment': 'production',
    },
    timeseries: [
      {
        x: 1615323780000,
        y: 32,
        threshold: 2,
      },
      {
        x: 1615324080000,
        y: 34,
        threshold: 2,
      },
      {
        x: 1615324380000,
        y: 32,
        threshold: 2,
      },
      {
        x: 1615324680000,
        y: 34,
        threshold: 2,
      },
      {
        x: 1615324980000,
        y: 35,
        threshold: 2,
      },
      {
        x: 1615325280000,
        y: 31,
        threshold: 2,
      },
      {
        x: 1615325580000,
        y: 36,
        threshold: 2,
      },
      {
        x: 1615325880000,
        y: 35,
        threshold: 2,
      },
    ],
    recovered: true,
  },
  {
    '@timestamp': 1615326143423,
    first_seen: 1615325783256,
    severity: 'warning',
    severity_value: 27,
    reason: 'Error count for opbeans-java in production was above the threshold of 2 (27)',
    rule_id: '335b38d0-80be-11eb-9fd1-d3725789930d',
    rule_name: 'Error count threshold',
    rule_type_id: 'apm.error_rate',
    rule_type_name: 'Error count threshold',
    alert_instance_title: ['opbeans-java:production'],
    alert_instance_name: 'opbeans-java_production',
    unique: 1,
    group_by_field: 'alert_instance.uuid',
    group_by_value: '73075d90-e27a-4e20-9ba0-3512a16c2829',
    influencers: ['service.name:opbeans-java', 'service.environment:production'],
    fields: {
      'processor.event': 'error',
      'service.name': 'opbeans-java',
      'service.environment': 'production',
    },
    timeseries: [
      {
        x: 1615325760000,
        y: 36,
        threshold: 2,
      },
      {
        x: 1615325820000,
        y: 26,
        threshold: 2,
      },
      {
        x: 1615325880000,
        y: 28,
        threshold: 2,
      },
      {
        x: 1615325940000,
        y: 35,
        threshold: 2,
      },
      {
        x: 1615326000000,
        y: 32,
        threshold: 2,
      },
      {
        x: 1615326060000,
        y: 23,
        threshold: 2,
      },
      {
        x: 1615326120000,
        y: 27,
        threshold: 2,
      },
    ],
    recovered: true,
  },
  {
    '@timestamp': 1615326143423,
    first_seen: 1615323802378,
    severity: 'warning',
    severity_value: 4759.9116,
    reason:
      'Transaction duration for opbeans-java/request in production was above the threshold of 1.0 ms (4.8 ms)',
    rule_id: 'cb1fc3e0-7fef-11eb-827d-d94e80a23d8d',
    rule_name: 'Latency threshold | opbeans-java',
    rule_type_id: 'apm.transaction_duration',
    rule_type_name: 'Latency threshold',
    alert_instance_title: ['opbeans-java/request:production'],
    alert_instance_name: 'apm.transaction_duration_production',
    unique: 1,
    group_by_field: 'alert_instance.uuid',
    group_by_value: 'ffa0437d-6656-4553-a1cd-c170fc6e2f81',
    influencers: [
      'service.name:opbeans-java',
      'service.environment:production',
      'transaction.type:request',
    ],
    fields: {
      'processor.event': 'transaction',
      'service.name': 'opbeans-java',
      'service.environment': 'production',
      'transaction.type': 'request',
    },
    timeseries: [
      {
        x: 1615323780000,
        y: 13145.51171875,
        threshold: 1000,
      },
      {
        x: 1615324080000,
        y: 15995.15625,
        threshold: 1000,
      },
      {
        x: 1615324380000,
        y: 18974.59375,
        threshold: 1000,
      },
      {
        x: 1615324680000,
        y: 11604.87890625,
        threshold: 1000,
      },
      {
        x: 1615324980000,
        y: 17945.9609375,
        threshold: 1000,
      },
      {
        x: 1615325280000,
        y: 9933.22265625,
        threshold: 1000,
      },
      {
        x: 1615325580000,
        y: 10011.58984375,
        threshold: 1000,
      },
      {
        x: 1615325880000,
        y: 10953.1845703125,
        threshold: 1000,
      },
    ],
    recovered: true,
  },
  {
    '@timestamp': 1615325663207,
    first_seen: 1615324762861,
    severity: 'warning',
    severity_value: 27,
    reason: 'Error count for opbeans-java in production was above the threshold of 2 (27)',
    rule_id: '335b38d0-80be-11eb-9fd1-d3725789930d',
    rule_name: 'Error count threshold',
    rule_type_id: 'apm.error_rate',
    rule_type_name: 'Error count threshold',
    alert_instance_title: ['opbeans-java:production'],
    alert_instance_name: 'opbeans-java_production',
    unique: 1,
    group_by_field: 'alert_instance.uuid',
    group_by_value: 'bf5f9574-57c8-44ed-9a3c-512b446695cf',
    influencers: ['service.name:opbeans-java', 'service.environment:production'],
    fields: {
      'processor.event': 'error',
      'service.name': 'opbeans-java',
      'service.environment': 'production',
    },
    timeseries: [
      {
        x: 1615324740000,
        y: 34,
        threshold: 2,
      },
      {
        x: 1615325040000,
        y: 35,
        threshold: 2,
      },
      {
        x: 1615325340000,
        y: 31,
        threshold: 2,
      },
      {
        x: 1615325640000,
        y: 27,
        threshold: 2,
      },
    ],
    recovered: true,
  },
  {
    '@timestamp': 1615324642764,
    first_seen: 1615324402620,
    severity: 'warning',
    severity_value: 32,
    reason: 'Error count for opbeans-java in production was above the threshold of 2 (32)',
    rule_id: '335b38d0-80be-11eb-9fd1-d3725789930d',
    rule_name: 'Error count threshold',
    rule_type_id: 'apm.error_rate',
    rule_type_name: 'Error count threshold',
    alert_instance_title: ['opbeans-java:production'],
    alert_instance_name: 'opbeans-java_production',
    unique: 1,
    group_by_field: 'alert_instance.uuid',
    group_by_value: '87768bef-67a3-4ddd-b95d-7ab8830b30ef',
    influencers: ['service.name:opbeans-java', 'service.environment:production'],
    fields: {
      'processor.event': 'error',
      'service.name': 'opbeans-java',
      'service.environment': 'production',
    },
    timeseries: [
      {
        x: 1615324402000,
        y: 30,
        threshold: 2,
      },
      {
        x: 1615324432000,
        y: null,
        threshold: null,
      },
      {
        x: 1615324462000,
        y: 28,
        threshold: 2,
      },
      {
        x: 1615324492000,
        y: null,
        threshold: null,
      },
      {
        x: 1615324522000,
        y: 30,
        threshold: 2,
      },
      {
        x: 1615324552000,
        y: null,
        threshold: null,
      },
      {
        x: 1615324582000,
        y: 18,
        threshold: 2,
      },
      {
        x: 1615324612000,
        y: null,
        threshold: null,
      },
      {
        x: 1615324642000,
        y: 32,
        threshold: 2,
      },
    ],
    recovered: true,
  },
  {
    '@timestamp': 1615324282583,
    first_seen: 1615323802378,
    severity: 'warning',
    severity_value: 30,
    reason: 'Error count for opbeans-java in production was above the threshold of 2 (30)',
    rule_id: '335b38d0-80be-11eb-9fd1-d3725789930d',
    rule_name: 'Error count threshold',
    rule_type_id: 'apm.error_rate',
    rule_type_name: 'Error count threshold',
    alert_instance_title: ['opbeans-java:production'],
    alert_instance_name: 'opbeans-java_production',
    unique: 1,
    group_by_field: 'alert_instance.uuid',
    group_by_value: '31d087bd-51ae-419d-81c0-d0671eb97392',
    influencers: ['service.name:opbeans-java', 'service.environment:production'],
    fields: {
      'processor.event': 'error',
      'service.name': 'opbeans-java',
      'service.environment': 'production',
    },
    timeseries: [
      {
        x: 1615323780000,
        y: 31,
        threshold: 2,
      },
      {
        x: 1615323840000,
        y: 30,
        threshold: 2,
      },
      {
        x: 1615323900000,
        y: 24,
        threshold: 2,
      },
      {
        x: 1615323960000,
        y: 32,
        threshold: 2,
      },
      {
        x: 1615324020000,
        y: 32,
        threshold: 2,
      },
      {
        x: 1615324080000,
        y: 30,
        threshold: 2,
      },
      {
        x: 1615324140000,
        y: 25,
        threshold: 2,
      },
      {
        x: 1615324200000,
        y: 34,
        threshold: 2,
      },
      {
        x: 1615324260000,
        y: 30,
        threshold: 2,
      },
    ],
    recovered: true,
  },
];
